(() => {
  const video = document.getElementById("gameVideo");
  const canvas = document.getElementById("overlayCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  const countdownEl = document.getElementById("countdown");
  const countText = document.getElementById("countText");
  const bottomMessage = document.getElementById("bottomMessage");
  const actions = document.getElementById("actions");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  // State
  let drawingMode = false;
  let isDrawing = false;
  let startX = 0,
    startY = 0,
    endX = 0,
    endY = 0;
  let drawn = false;
  let messageTimeout = null;

  // CSV Handling --------[V2]-------------------
  let labelsData = [];

  // Load CSV using Fetch API
  function loadCSV(callback) {
    fetch("data/labels_xyxy.csv")
      .then((response) => response.text())
      .then((data) => {
        // Parse CSV manually
        const lines = data.trim().split("\n");
        const headers = lines[0].split(",");
        labelsData = lines.slice(1).map((line) => {
          const values = line.split(",");
          let obj = {};
          headers.forEach((h, i) => {
            obj[h] = Number(values[i]); // convert all to numbers
          });
          return obj;
        });
        console.log("CSV loaded:", labelsData);
        if (callback) callback();
      })
      .catch((err) => {
        console.error("CSV load error:", err);
      });
  }

  /**
   * Calculate IoU (Intersection over Union) between two boxes*/
  function calculateIoU(
    x1_true,
    y1_true,
    x2_true,
    y2_true,
    x1_player,
    y1_player,
    x2_player,
    y2_player
  ) {
    // Calculate intersection coordinates
    const x_left = Math.max(x1_true, x1_player);
    const y_top = Math.max(y1_true, y1_player);
    const x_right = Math.min(x2_true, x2_player);
    const y_bottom = Math.min(y2_true, y2_player);

    // Check if there is no overlap
    if (x_right < x_left || y_bottom < y_top) return 0;

    const intersectionArea = (x_right - x_left) * (y_bottom - y_top);

    const trueArea = (x2_true - x1_true) * (y2_true - y1_true);
    const playerArea = (x2_player - x1_player) * (y2_player - y1_player);

    const unionArea = trueArea + playerArea - intersectionArea;

    const iou = intersectionArea / unionArea;

    return iou * 100; // percentage
  }

  // Main function
  function getFrameValues(time_ms, x1_player, x2_player, y1_player, y2_player) {
    if (labelsData.length === 0) {
      alert("CSV not loaded yet!");
      return;
    }

    // Round to nearest 50
    const lowerFrame = Math.floor(time_ms / 50) * 50;
    const upperFrame = Math.ceil(time_ms / 50) * 50;

    let lowerData = labelsData.find((row) => row.frame === lowerFrame);
    let upperData = labelsData.find((row) => row.frame === upperFrame);

    if (!lowerData) {
      alert(`No data for lower frame: ${lowerFrame}`);
      return;
    }
    if (!upperData) {
      upperData = lowerData; // if upper not found, use lower
    }

    // Store in variables
    const x1_lower = lowerData.x1;
    const y1_lower = lowerData.y1;
    const x2_lower = lowerData.x2;
    const y2_lower = lowerData.y2;

    const x1_upper = upperData.x1;
    const y1_upper = upperData.y1;
    const x2_upper = upperData.x2;
    const y2_upper = upperData.y2;

    let IOU1 = calculateIoU(
      x1_lower,
      y1_lower,
      x2_lower,
      y2_lower,
      x1_player,
      y1_player,
      x2_player,
      y2_player
    );
    let IOU2 = calculateIoU(
      x1_upper,
      y1_upper,
      x2_upper,
      y2_upper,
      x1_player,
      y1_player,
      x2_player,
      y2_player
    );
    return (IOU1 + IOU2) / 2.0;
  }

  //
  //
  //
  //

  // Path to your JSON file
  const filePath = "data/leaderboard.json";
  const localStorageKey = "leaderboard";

  // Load leaderboard: either from localStorage or from local JSON file
  async function loadLeaderboard() {
    let data = JSON.parse(localStorage.getItem(localStorageKey) || "null");
    if (!data) {
      try {
        const response = await fetch(filePath);
        data = await response.json();
        localStorage.setItem(localStorageKey, JSON.stringify(data, null, 2));
      } catch (err) {
        console.error("Error loading player.json:", err);
        data = [];
      }
    }
    return data;
  }

  // Update leaderboard with new players
  async function updateLeaderboard(newPlayers) {
    const existingData = await loadLeaderboard();
    const updatedData = existingData.concat(newPlayers);
    localStorage.setItem(localStorageKey, JSON.stringify(updatedData, null, 2));
    renderLeaderboard(); // Refresh table
    console.log("Leaderboard updated!");
  }

  //--------------------------------------------------------------
  //
  //
  //
  //
  // ------------------ Canvas / Video mapping ------------------
  function fitCanvasToVideo() {
    const rect = video.getBoundingClientRect();
    canvas.style.left = rect.left + "px";
    canvas.style.top = rect.top + "px";
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearCanvas();
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawRectVisual(x1, y1, x2, y2) {
    clearCanvas();
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,255,136,1)";
    ctx.shadowColor = "rgba(0,255,136,0.55)";
    ctx.shadowBlur = 18;
    ctx.strokeRect(left, top, w, h);
    ctx.restore();
  }

  // ------------------ Correct client -> video coords ------------------
  function clientToVideoCSS(clientX, clientY) {
    const rect = video.getBoundingClientRect();
    const videoAspect = video.videoWidth / video.videoHeight;
    const rectAspect = rect.width / rect.height;

    let width = rect.width;
    let height = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (rectAspect > videoAspect) {
      // letterbox horizontally
      width = rect.height * videoAspect;
      offsetX = (rect.width - width) / 2;
    } else if (rectAspect < videoAspect) {
      // letterbox vertically
      height = rect.width / videoAspect;
      offsetY = (rect.height - height) / 2;
    }

    let x = clientX - rect.left - offsetX;
    let y = clientY - rect.top - offsetY;

    x = Math.max(0, Math.min(x, width));
    y = Math.max(0, Math.min(y, height));

    return { x, y, width, height };
  }

  // ------------------ Countdown ------------------
  function runCountdown(steps = ["3", "2", "1", "GO!"], interval = 900) {
    let i = 0;
    countText.textContent = steps[i];
    countdownEl.classList.remove("hidden");
    countdownEl.classList.add("visible");

    const tick = () => {
      countText.classList.remove("pop");
      void countText.offsetWidth; // force reflow
      countText.classList.add("pop");

      setTimeout(() => {
        i++;
        if (i < steps.length) {
          countText.textContent = steps[i];
          setTimeout(tick, interval);
        } else {
          countdownEl.classList.remove("visible");
          countdownEl.classList.add("hidden");
          startVideoPlayback();
        }
      }, interval);
    };

    setTimeout(tick, 120);
  }

  function startVideoPlayback() {
    try {
      video.currentTime = 0;
      video.style.opacity = "1";
      const playPromise = video.play();
      if (playPromise && playPromise.then) {
        playPromise.catch((err) => console.warn("Autoplay failed", err));
      }
    } catch (err) {
      console.error("Error starting video:", err);
    }
  }

  // ------------------ Drawing mode ------------------
  function showBottomMessageFor5s() {
    clearTimeout(messageTimeout);
    bottomMessage.classList.remove("hidden");
    bottomMessage.classList.add("visible");
    messageTimeout = setTimeout(() => {
      bottomMessage.classList.remove("visible");
      bottomMessage.classList.add("hidden");
    }, 5000);
  }

  function enterDrawingMode() {
    fitCanvasToVideo();
    canvas.classList.add("show");
    canvas.style.opacity = 1;
    canvas.style.pointerEvents = "auto";
    drawingMode = true;
    drawn = false;
    actions.classList.remove("visible");
    actions.classList.add("hidden");
  }

  function exitDrawingMode() {
    drawingMode = false;
    canvas.classList.remove("show");
    canvas.style.pointerEvents = "none";
    clearCanvas();
    drawn = false;
    actions.classList.remove("visible");
    actions.classList.add("hidden");
  }

  // ------------------ Pointer events ------------------
  function onPointerDown(e) {
    if (!drawingMode) return;
    e.preventDefault();
    isDrawing = true;
    const p = e.touches ? e.touches[0] : e;
    const pos = clientToVideoCSS(p.clientX, p.clientY);
    startX = pos.x;
    startY = pos.y;
    endX = pos.x;
    endY = pos.y;
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    const p = e.touches ? e.touches[0] : e;
    const pos = clientToVideoCSS(p.clientX, p.clientY);
    endX = pos.x;
    endY = pos.y;
    drawRectVisual(startX, startY, endX, endY);
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    drawn = true;
    actions.classList.remove("hidden");
    actions.classList.add("visible");
  }

  // Get Name From session storage
  const playerName = localStorage.getItem("playerName");

  // After game is finished, store score too
  function endGame(time_diff, confidence, score) {
    localStorage.setItem("timeDifference", time_diff);
    localStorage.setItem("confidence", confidence);
    localStorage.setItem("playerScore", score);

    const newPlayers = [
      {
        name: playerName,
        timeDifference: time_diff,
        confidence: confidence,
        score: score
      }
    ];

    updateLeaderboard(newPlayers);
    window.location.href = "results.html";
  }

  // ------------------ Confirm / Cancel ------------------
  confirmBtn.addEventListener("click", () => {
    if (!drawn) return;

    // Use actual video content size
    const { width: width_actual, height: height_actual } = clientToVideoCSS(
      0,
      0
    );
    const videoWidthIntrinsic = video.videoWidth;
    const videoHeightIntrinsic = video.videoHeight;

    const scaleX_intrinsic = videoWidthIntrinsic / width_actual;
    const scaleY_intrinsic = videoHeightIntrinsic / height_actual;

    const x1_intrinsic = startX * scaleX_intrinsic;
    const y1_intrinsic = startY * scaleY_intrinsic;
    const x2_intrinsic = endX * scaleX_intrinsic;
    const y2_intrinsic = endY * scaleY_intrinsic;

    const xMin = Math.round(Math.min(x1_intrinsic, x2_intrinsic));
    const yMin = Math.round(Math.min(y1_intrinsic, y2_intrinsic));
    const xMax = Math.round(Math.max(x1_intrinsic, x2_intrinsic));
    const yMax = Math.round(Math.max(y1_intrinsic, y2_intrinsic));

    const scaleX_1080 = 1920 / videoWidthIntrinsic;
    const scaleY_1080 = 1080 / videoHeightIntrinsic;

    const bbox_1080p = {
      x1: Math.round(xMin * scaleX_1080),
      y1: Math.round(yMin * scaleY_1080),
      x2: Math.round(xMax * scaleX_1080),
      y2: Math.round(yMax * scaleY_1080),
    };

    const timestamp_ms = Math.round(video.currentTime * 1000);

    console.log({ bbox_1080p, timestamp_ms });
    //alert(JSON.stringify({ bbox_1080p, timestamp_ms }, null, 2));
    time_diff = timestamp_ms - 10800;

    if (timestamp_ms < 10800) {
      // False Positive Calse
      endGame(time_diff, 0, 0);
    } else if (timestamp_ms >= 10800 && timestamp_ms <= 16150) {
      // Load CSV and use bbox values dynamically
      loadCSV(() => {
        const iouValue = getFrameValues(
          timestamp_ms,
          bbox_1080p.x1,
          bbox_1080p.x2,
          bbox_1080p.y1,
          bbox_1080p.y2
        );
        const score = Math.round(((16150 - timestamp_ms) * iouValue) / 100);
        endGame(time_diff, iouValue.toFixed(2), score);
      });
    } else {
      // False Positive Calse
      endGame(time_diff, 0, 0);
    }
  });

  cancelBtn.addEventListener("click", () => {
    clearCanvas();
    drawn = false;
    actions.classList.remove("visible");
    actions.classList.add("hidden");
  });

  // ------------------ Keyboard ------------------
  function onKeyDown(e) {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (!drawingMode) {
        try {
          video.pause();
        } catch (err) {}
        showBottomMessageFor5s();
        enterDrawingMode();
      }
    }

    if (e.key === "Escape") {
      if (drawingMode) {
        exitDrawingMode();
        bottomMessage.classList.remove("visible");
        bottomMessage.classList.add("hidden");
        try {
          video.play();
        } catch (err) {}
      }
    }
  }

  // ------------------ Setup ------------------
  function attachPointerListeners() {
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp, { passive: false });
    canvas.addEventListener("pointercancel", onPointerUp, { passive: false });

    canvas.addEventListener("touchstart", onPointerDown, { passive: false });
    canvas.addEventListener("touchmove", onPointerMove, { passive: false });
    canvas.addEventListener("touchend", onPointerUp, { passive: false });

    canvas.addEventListener("mousedown", onPointerDown, { passive: false });
    window.addEventListener("mousemove", onPointerMove, { passive: false });
    window.addEventListener("mouseup", onPointerUp, { passive: false });
  }

  window.addEventListener("resize", fitCanvasToVideo);
  window.addEventListener("scroll", fitCanvasToVideo);
  window.addEventListener("keydown", onKeyDown, { passive: false });

  attachPointerListeners();

  video.addEventListener("loadedmetadata", () =>
    runCountdown(["3", "2", "1", "GO!"], 850)
  );
  if (video.readyState >= 1) runCountdown(["3", "2", "1", "GO!"], 850);

  setTimeout(fitCanvasToVideo, 300);
})();
