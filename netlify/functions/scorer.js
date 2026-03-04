// netlify/functions/scorer.js

function calculateScore(data) {

  const weights = {
    skills: 0.25,
    keywords: 0.20,
    experience: 0.15,
    achievements: 0.15,
    actionVerbs: 0.10,
    formatting: 0.10,
    education: 0.05
  };

  // safety fallback (prevents crashes)
  const safe = {
    skillsMatch: data.skillsMatch || 0,
    keywordMatch: data.keywordMatch || 0,
    experienceScore: data.experienceScore || 0,
    achievementScore: data.achievementScore || 0,
    actionVerbScore: data.actionVerbScore || 0,
    formatScore: data.formatScore || 0,
    educationScore: data.educationScore || 0
  };

  const total =
    (safe.skillsMatch * weights.skills) +
    (safe.keywordMatch * weights.keywords) +
    (safe.experienceScore * weights.experience) +
    (safe.achievementScore * weights.achievements) +
    (safe.actionVerbScore * weights.actionVerbs) +
    (safe.formatScore * weights.formatting) +
    (safe.educationScore * weights.education);

  return Math.round(total * 100);
}

module.exports = { calculateScore };