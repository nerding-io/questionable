// background.js - Handles requests from the frontend, runs the model, then sends back a response
// TODO - make persistent (i.e., do not close after inactivity)

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "popup") {
    port.onDisconnect.addListener(function () {
      console.log("popup disconnected");
      chrome.runtime.sendMessage({
        action: "clearHighlight",
      });
    });
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["mark.min.js", "content.js"],
    });
  }
});

function chunkStringByWords(string, chunkSize) {
  const words = string.split(" ");
  const chunks = [];
  let index = 0;

  while (index < words.length) {
    chunks.push(words.slice(index, index + chunkSize).join(" "));
    index += chunkSize;
  }

  return chunks;
}

if (
  typeof ServiceWorkerGlobalScope !== "undefined" &&
  self instanceof ServiceWorkerGlobalScope
) {
  // Load the library
  const { pipeline, env } = require("@xenova/transformers");

  // Set environment variables to only use local models.
  env.useBrowserCache = false;
  env.remoteModels = false;
  env.localModelPath = chrome.runtime.getURL("models/");
  env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL("wasm/");
  env.backends.onnx.wasm.numThreads = 1;

  console.log("Worker loaded Q/A");

  const modelPromise = pipeline(
    "question-answering",
    // "deepset/roberta-base-squad2",
    // "bert-base-uncased",
    undefined,
    // "",
    {
      progress_callback: (progress) => {
        // console.log("progress", progress);
        chrome.runtime.sendMessage({
          action: "progress",
          progress,
        });
      },
    }
  );

  // Listen for messages from the UI, process it, and send the result back.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check if the message is for this script
    if (message.action == "transform") {
      console.log("message", message);
      // Run model prediction asynchronously
      (async function () {
        const { question, context, tabId } = message;

        let model = await modelPromise; // Load model if not already loaded

        const chunks = chunkStringByWords(context, 100); // TODO: - make this dynamic with chrome.storage

        // Loop through chunks and run model
        const results = await Promise.all(
          chunks.map(async (chunk, i) => {
            // Run model
            const result = await model(
              question,
              chunk
              // {
              //   padding: true,
              //   truncation: true,
              // }
            );

            return result;
          })
        );

        // Sort by highest results
        results.sort((a, b) => b.score - a.score);

        console.log("results", results);
        response = {
          action: "searchAndHighlight",
          results,
        };
        sendResponse(response); // Send response back to UI
        chrome.tabs.sendMessage(tabId, response); // Send to content script
      })();

      // return true to indicate we will send a response asynchronously
      // see https://stackoverflow.com/a/46628145 for more information
      return true;
    }
  });
}
