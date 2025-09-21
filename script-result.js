const cursor = document.getElementById("cursor");
// load data from storage
const storedPlayerName = localStorage.getItem("playerName");
const storedPlayerScore = localStorage.getItem("playerScore");
const storedPlayerTimeDifference = localStorage.getItem("timeDifference");
const storedPlayerConfidence = localStorage.getItem("confidence");

// Demo player result
const playerResult = {
  name: "PlayerX",
  score: 1250,
  won: true,
};

const resultText = document.getElementById("resultText");
const resultGif = document.getElementById("resultGif");
const playerName = document.getElementById("playerName");
const playerScore = document.getElementById("playerScore");
const homeBtn = document.getElementById("homeBtn");
const downloadBtn = document.getElementById("downloadJsonBtn");

// Cursor animation
let mouseX = window.innerWidth / 2,
  mouseY = window.innerHeight / 2;
let curX = mouseX,
  curY = mouseY;
const speed = 0.18;
window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.opacity = 1;
});

function animate() {
  curX += (mouseX - curX) * speed;
  curY += (mouseY - curY) * speed;
  cursor.style.transform = `translate(${curX}px, ${curY}px)`;
  requestAnimationFrame(animate);
}
animate();

// fetch JSON instead of CSV
/*
fetch('data/leaderboard.json')
  .then(resp => resp.json())
  .then(players => {
    const tbody = document.getElementById('leaderboardBody');
    players.slice(0,10).forEach((p,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${p.name}</td><td>${p.score}</td>`;
      tbody.appendChild(tr);
    });
  });
*/
// fetch JSON and display top 10 highest scores
async function displayTop10Leaderboard() {
  const tbody = document.getElementById("leaderboardBody");

  let players;

  // Try to get from localStorage
  const storedData = localStorage.getItem("leaderboard");
  if (storedData) {
    players = JSON.parse(storedData);
  } else {
    // Fallback: fetch from JSON file
    try {
      const resp = await fetch("data/leaderboard.json");
      players = await resp.json();
      // Store in localStorage for next time
      localStorage.setItem("leaderboard", JSON.stringify(players, null, 2));
    } catch (err) {
      console.error("Failed to load leaderboard.json:", err);
      players = [];
    }
  }

  // Sort by score descending and take top 10
  const top10 = players.sort((a, b) => b.score - a.score).slice(0, 10);

  // Clear previous table rows
  tbody.innerHTML = "";

  // Render rows
  top10.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${p.name}</td><td>${p.score}</td>`;
    tbody.appendChild(tr);
  });
}

function downloadLocalStorageJSON() {
  // Get leaderboard from localStorage
  let leaderboard = localStorage.getItem("leaderboard");
  if (!leaderboard) {
    alert("No leaderboard data found in localStorage");
    return;
  }

  // Parse it to ensure it's valid JSON
  let leaderboardArray;
  try {
    leaderboardArray = JSON.parse(leaderboard);
  } catch (e) {
    alert("Leaderboard data is corrupted");
    return;
  }

  // Convert back to a pretty JSON string
  let jsonString = JSON.stringify(leaderboardArray, null, 2);

  // Create a Blob and trigger download
  let blob = new Blob([jsonString], { type: "application/json" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "leaderboard.json"; // filename
  a.click();

  // Cleanup
  URL.revokeObjectURL(url);
}


homeBtn.addEventListener("click", () => {
  // Redirect to results.html
  window.location.href = "index.html";
});

downloadBtn.addEventListener("click", () => {
  downloadLocalStorageJSON();
});

// Usage
displayTop10Leaderboard();

window.addEventListener("DOMContentLoaded", () => {
  const storedPlayerName = localStorage.getItem("playerName");
  const storedPlayerScore = localStorage.getItem("playerScore");
  const storedPlayerTimeDifference = localStorage.getItem("timeDifference");
  const storedPlayerConfidence = localStorage.getItem("confidence");
  playerName.textContent = storedPlayerName;
  playerScore.textContent = `Score: ${storedPlayerScore} || Time : ${
    storedPlayerTimeDifference / 1000
  } S    ||  Confidence : ${storedPlayerConfidence}`;

  resultText.textContent = storedPlayerScore > 3000 ? "You Won!" : "You Lost!";
  resultGif.src =
    storedPlayerScore > 3000 ? "assets/win.gif" : "assets/lose.gif";
});
