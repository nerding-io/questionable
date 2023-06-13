chrome.runtime.connect({ name: "popup" });

// This script handles interaction with the user interface, as well as handling
// the communication between the main thread (UI) and the background thread (processing).
var context;
var tabId;
let DEBUG = false; // TODO: make this a chrome storage option

const searchInput = document.querySelector(".search-bar input");
const searchButton = document.querySelector(".search-bar .search-button");
const spinnerElement = document.getElementById("spinner");
const searchResultsDiv = document.getElementById("searchResults");
const outputElement = document.getElementById("output");

const getInnerText = () => {
  return document.body.innerText;
};

async function getInnerHTMLFromPage() {
  await chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      tabId = tabs[0].id;
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: getInnerText,
        // args: [answer],
      });

      context = result[0].result;
    }
  );
}
getInnerHTMLFromPage();

// toggle spinner
function toggleSpinner(response) {
  if (response === false) {
    spinnerElement.style.display = "none";
    searchResultsDiv.innerHTML = "Please enter a question.";

    // Debugging output
    if (DEBUG === true) {
      // TODO: make this a chrome storage option
      outputElement.style.display = response ? "none" : "block";
      outputElement.innerText = "Please enter a question.";
    }
  } else {
    // Display the spinner if there is no result text
    spinnerElement.style.display = response ? "none" : "block";
    searchResultsDiv.style.display = response ? "block" : "none";

    // Debugging output
    if (DEBUG === true) {
      // TODO: make this a chrome storage option
      outputElement.style.display = response ? "none" : "block";
      outputElement.innerText = JSON.stringify(response, null, 2);
    }
  }
}

function handleSearchResult(result) {
  chrome.tabs.sendMessage(tabId, {
    action: "searchAndHighlight",
    results: [result],
  });
}

// Create the search result HTML dynamically
function createSearchResultHTML(results) {
  results.forEach((result) => {
    // Create a div to contain the result
    const resultDiv = document.createElement("div");
    resultDiv.className = "result";
    // Calculate the score percentage
    const scorePercentage = Math.round(result.score * 100);
    // Create the HTML for the result
    resultDiv.innerHTML = `
      <div class="result-text">
        ${result.answer}
      </div>
      <div class="score-badge-container">
        <span class="score-badge">${scorePercentage}%</span>
      </div>
    `;

    // Set ARIA attributes for accessibility
    resultDiv.setAttribute("role", "button");
    resultDiv.setAttribute("tabindex", "0");

    // Add a keydown event listener to the result div
    resultDiv.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        // Handle the click event when Enter or Spacebar is pressed
        handleSearchResult(result);
      }
    });

    // Add a click event listener to the result div
    resultDiv.addEventListener("click", () => {
      // Handle click event, e.g., open a link or perform an action
      console.log("Clicked on:", result.answer);
      handleSearchResult(result);
    });

    searchResultsDiv.appendChild(resultDiv);
  });
}

// Perform search function
function performSearch() {
  const question = searchInput.value;
  searchResultsDiv.innerHTML = "";
  // Check if the user entered a question
  if (!question) {
    console.log("no question");
    toggleSpinner(false);
    return;
  }

  console.log("question", question);
  // Add your search logic here
  chrome.runtime.sendMessage(
    {
      action: "transform",
      question,
      context,
      tabId,
    },
    (response) => {
      // Handle results returned by the service worker (`background.js`) and update the UI.
      toggleSpinner(response);
      // Call the function with the search results
      createSearchResultHTML(response.results);
    }
  );
}
// Focus on the search input when the popup loads
document.addEventListener("DOMContentLoaded", () => {
  searchInput.focus();
});

// Click event listener for the search button (SVG)
searchButton.addEventListener("click", function () {
  console.log("clicked");
  // Display the spinner if there is no result text
  spinnerElement.style.display = "block";
  performSearch();
});

//  Keydown (space & enter) event listener for the search button (SVG)
searchButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    // Handle the click event when Enter or Spacebar is pressed
    spinnerElement.style.display = "block";
    performSearch();
  }
});

// Keypress event listener for the search input
searchInput.addEventListener("keypress", function (event) {
  console.log("keypressed");
  if (event.key === "Enter") {
    console.log("enter");
    // Display the spinner if there is no result text
    spinnerElement.style.display = "block";
    performSearch();
  }
});
