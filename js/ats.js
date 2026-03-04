(function () {

  const uploadArea = document.getElementById("ats-upload-area");
  const fileInput = document.getElementById("ats-file-input");
  const fileInfo = document.getElementById("ats-file-info");
  const fileName = document.getElementById("ats-file-name");
  const fileSize = document.getElementById("ats-file-size");
  const fileRemove = document.getElementById("ats-file-remove");
  const jobDesc = document.getElementById("ats-job-desc");
  const scanBtn = document.getElementById("ats-scan-btn");
  const loading = document.getElementById("ats-loading");
  const errorDiv = document.getElementById("ats-error");
  const results = document.getElementById("ats-results");
  const scanAgainBtn = document.getElementById("ats-scan-again-btn");

  if (!uploadArea || !fileInput || !scanBtn) return;

  let selectedFile = null;

  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const MAX_SIZE = 10 * 1024 * 1024;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.add("visible");
  }

  function hideError() {
    errorDiv.classList.remove("visible");
  }

  function setFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    fileInfo.classList.add("visible");
    uploadArea.style.display = "none";
    hideError();
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = "";
    fileInfo.classList.remove("visible");
    uploadArea.style.display = "";
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject();
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderList(id, items, icon) {
    const list = document.getElementById(id);
    list.innerHTML = "";

    if (!items || items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "None identified";
      list.appendChild(li);
      return;
    }

    items.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = icon + "<span>" + escapeHtml(item) + "</span>";
      list.appendChild(li);
    });
  }

  function getScoreClass(score) {
    if (score >= 70) return "score-high";
    if (score >= 40) return "score-medium";
    return "score-low";
  }

  /* ===============================
     MAIN RESULT RENDERER
  =============================== */

  function renderResults(data) {

    const score = data.score || data.finalScore || 0;
    const keywordMatch = Math.round((data.keywordMatch || 0) * 100);

    const scoreCard = document.getElementById("ats-score-card");
    scoreCard.className = "ats-score-card " + getScoreClass(score);

    document.getElementById("ats-score-number").textContent = score;
    document.getElementById("ats-overall-score").textContent = score;
    document.getElementById("ats-keyword-score").textContent = keywordMatch;

    const circumference = 2 * Math.PI * 62;
    const offset = circumference - (score / 100) * circumference;
    const progress = document.getElementById("ats-progress");

    progress.style.strokeDasharray = circumference;
    progress.style.strokeDashoffset = circumference;

    requestAnimationFrame(() => {
      progress.style.strokeDashoffset = offset;
    });

    const checkIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M5 13l4 4L19 7"/></svg>';

    const warnIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 9v2m0 4h.01"/></svg>';

    const lightIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M9.663 17h4.673"/></svg>';

    /* ===== AUTO STRENGTHS ===== */
    const strengths = [];

    if ((data.skillsMatch || 0) >= 0.8)
      strengths.push("Strong skills alignment with job role");

    if ((data.experienceScore || 0) >= 0.8)
      strengths.push("Experience level matches employer expectations");

    if ((data.educationScore || 0) >= 0.7)
      strengths.push("Education background supports the position");

    renderList("ats-strengths-list", strengths, checkIcon);

    /* ===== MISSING SKILLS ===== */
    renderList("ats-missing-list", data.missingSkills || [], warnIcon);

    /* ===== ISSUES ===== */
    const issues = [];

    if ((data.formatScore || 0) < 0.7)
      issues.push("Resume formatting may reduce ATS readability");

    if ((data.actionVerbScore || 0) < 0.7)
      issues.push("Use stronger action verbs for impact");

    renderList("ats-issues-list", issues, warnIcon);

    /* ===== RECOMMENDATIONS ===== */
    renderList("ats-recommendations-list", data.improvements || [], lightIcon);

    results.classList.add("visible");
  }

  /* ===============================
     EVENTS
  =============================== */

  uploadArea.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
  });

  fileRemove.addEventListener("click", clearFile);

  scanBtn.addEventListener("click", async () => {

    if (!selectedFile) {
      showError("Please upload a resume file first.");
      return;
    }

    results.classList.remove("visible");
    loading.classList.add("visible");
    scanBtn.disabled = true;

    try {
      const base64 = await fileToBase64(selectedFile);

      const response = await fetch("/.netlify/functions/ats-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: base64,
          fileName: selectedFile.name,
          jobDescription: jobDesc.value.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      loading.classList.remove("visible");
      renderResults(data);

    } catch (err) {
      loading.classList.remove("visible");
      showError("Scan failed. Please try again.");
    }

    scanBtn.disabled = false;
  });

  scanAgainBtn.addEventListener("click", () => {
    results.classList.remove("visible");
    clearFile();
    jobDesc.value = "";
    hideError();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

})();