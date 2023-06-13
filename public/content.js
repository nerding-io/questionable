// if (typeof questionableMarker === "undefined") {
//   let questionableMarker = new Mark(document.body);
// }
// var questionableMarker = questionableMarker || new Mark(document.body);
var questionableMarker = new Mark(document.body);
var questionableCurrentIndex = 0;
var questionableTotalMarks = 0;

var questionableStyle = document.createElement("style");
questionableStyle.textContent = `
mark.questionable-highlight {
  background-color: #01b2ed;
}

mark.questionable-highlight.active {
  background-color: #01b2ed;
}
/* Dark theme if user prefers dark mode */
@media (prefers-color-scheme: dark) {

  mark.questionable-highlight {
    background-color: #01b2ed;
  }

  mark.questionable-highlight.active {
    background-color: #01b2ed;
  }
}`;
document.head.append(questionableStyle);

async function questionableSearchAndHighlightText(search) {
  if (search) {
    questionableMarker.unmark(); // clear previous marks

    questionableMarker.mark(search, {
      element: "mark",
      className: "questionable-highlight",
      accuracy: "partially",
      separateWordSearch: false,
      ignoreJoiners: true,
      acrossElements: true,
      done: function (counter) {
        console.log("marked", counter);
        questionableTotalMarks = counter;
        questionableCurrentIndex = 0;
        questionableNavigateHighlight(0);
      },
    });
  }
}

// Navigate through the highlighted terms
// TODO: Add a way to navigate through the terms in the popup
// Current firing rest click event
function questionableNavigateHighlight(direction) {
  let questionableHighlights = document.querySelectorAll(
    "mark.questionable-highlight"
  );
  if (questionableHighlights.length > 0) {
    // Remove active class from current highlight
    if (questionableHighlights[questionableCurrentIndex]) {
      questionableHighlights[questionableCurrentIndex].classList.remove(
        "active"
      );
    }

    questionableCurrentIndex += direction;
    if (questionableCurrentIndex < 0)
      questionableCurrentIndex = questionableHighlights.length - 1;
    if (questionableCurrentIndex >= questionableHighlights.length)
      questionableCurrentIndex = 0;

    // Add active class to new current highlight
    questionableHighlights[questionableCurrentIndex].classList.add("active");

    // Scroll the active highlight into view
    questionableHighlights[questionableCurrentIndex].scrollIntoView({
      behavior: "smooth",
    });
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("CONTENT", request.action);

  if (request.action === "searchAndHighlight") {
    console.log("searchAndHighlight", request.results[0].answer);
    // @TODO: list all the highlights
    questionableSearchAndHighlightText(request.results[0].answer);
  } else if (request.action === "navigateHighlight") {
    questionableNavigateHighlight(request.direction);
  } else if (request.action === "clearHighlight") {
    questionableMarker.unmark();
  }
});
