const container = document.querySelector(".container");
const loginCard = document.getElementById("loginCard");
const playerInput = document.getElementById("playerInput");
const confirmBtn = document.getElementById("confirmBtn");
const playBtn = document.getElementById("playBtn");
const cancelBtn = document.getElementById("cancelBtn");
const leaderBtn = document.getElementById("leaderBtn");
const cursor = document.getElementById("cursor");
const topName = document.getElementById("topName");
const topScore = document.getElementById("topScore");

let confirmed = false;

let playerNameInputted = ""; // global or higher-scope variable

leaderBtn.addEventListener("click", () => {
  // Redirect to results.html
  window.location.href = "results.html";
});

function setConfirmedState(name) {
  // Validate input
  if (!name || name.trim() === "" || name.trim() == "Player") {
    alert("Please enter a valid player name.");
    return; // stop execution if invalid
  }
  // Update the variable
  playerNameInputted = name.trim();

  // Proceed with original logic
  confirmed = true;
  loginCard.classList.add("confirmed");
  playerInput.value = playerNameInputted;
  playerInput.blur();
  playBtn.textContent = `Play as ${playerNameInputted}`;
  playBtn.classList.remove("mini");
  cancelBtn.classList.remove("mini");
  playBtn.setAttribute("aria-disabled", "false");
  cancelBtn.setAttribute("aria-disabled", "false");
  confirmBtn.classList.add("pulse");
  confirmBtn.textContent = "✓";
}

function resetToInitial() {
  confirmed = false;
  loginCard.classList.remove("confirmed");
  playerInput.value = "";
  playBtn.textContent = "Play";
  playBtn.classList.add("mini");
  cancelBtn.classList.add("mini");
  playBtn.setAttribute("aria-disabled", "true");
  cancelBtn.setAttribute("aria-disabled", "true");
  confirmBtn.classList.remove("pulse");
  confirmBtn.textContent = "Confirm";
  playerInput.focus();
}

confirmBtn.addEventListener("click", () => {
  const name = playerInput.value.trim() || "Player";
  setConfirmedState(name);
});

playerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    confirmBtn.click();
  }
});

playBtn.addEventListener("click", () => {
  if (confirmed) {
    playBtn.classList.add("pulse");
    setTimeout(() => playBtn.classList.remove("pulse"), 1200);
    //alert(`Starting game as: ${playerInput.value}`);
    confirmName(playerNameInputted);
  }
});

// Use a Session Storage
function confirmName(name) {
  localStorage.setItem("playerName", name);
  window.location.href = "play.html";
}

cancelBtn.addEventListener("click", () => {
  resetToInitial();
});

// Cursor follow
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

// Cursor hover effects
const interactive = [confirmBtn, playBtn, cancelBtn, leaderBtn, playerInput];
interactive.forEach((el) => {
  el.addEventListener("mouseenter", () => {
    cursor.classList.add("big");
    el.style.boxShadow = el.classList.contains("btn--play")
      ? "0 0 54px rgba(255,45,210,0.24)"
      : "0 0 54px rgba(0,240,255,0.24)";
  });
  el.addEventListener("mouseleave", () => {
    cursor.classList.remove("big");
    el.style.boxShadow = "";
  });
});

// Background click focuses input
document.body.addEventListener("click", (e) => {
  if (!e.target.closest(".btn")) playerInput.focus();
});

playerInput.focus();

// accessibility: space/enter on confirm
confirmBtn.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    confirmBtn.click();
  }
});

// ESC to reset
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    resetToInitial();
  }
});

// entrance animation
requestAnimationFrame(() => {
  loginCard.style.transform = "translateY(6px)";
  loginCard.style.opacity = 1;
});

window.addEventListener("DOMContentLoaded", () => {
  /*
  // Function to get minimum score
  async function updateLowestScore() {
    try {
      // Fetch JSON file
      const response = await fetch("data/leaderboard.json");
      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) return;

      // Find the player with minimum score
      let maxPlayer = data[0];
      for (let player of data) {
        if (player.score > maxPlayer.score) {
          maxPlayer = player;
        }
      }

      // Update DOM elements
      const topName = document.getElementById("topName");
      const topScore = document.getElementById("topScore");
      topName.textContent = maxPlayer.name;
      topScore.textContent = maxPlayer.score;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  }

  // Call the function
  updateLowestScore();*/
  // Get the maximum scored person from saved JSON
  function getMaxScoredPlayer() {
    const storedData = localStorage.getItem("leaderboard");
    if (!storedData) {
      console.warn("No leaderboard data found in localStorage.");
      return null;
    }

    const players = JSON.parse(storedData);
    if (!players.length) return null;

    // Reduce to find the max scorer
    const maxPlayer = players.reduce((max, curr) =>
      curr.score > max.score ? curr : max
    );

    return maxPlayer; // { name: "Alice", score: 2200 }
  }

  // Example usage:
  const maxPlayer = getMaxScoredPlayer();
  topName.textContent = maxPlayer.name;
  topScore.textContent = maxPlayer.score;
});
