document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('explore-search-input');
  input.addEventListener('input', () => {
    clearTimeout(window.exploreSearchTimer);
    window.exploreSearchTimer = setTimeout(() => searchExploreUsers(input.value), 250);
  });
  loadExplore();
  window.exploreRefreshTimer = window.setInterval(() => { if (!document.hidden) loadExplore(); }, 10000);
});

async function searchExploreUsers(query) {
  const container = document.getElementById('explore-users');
  if (query.trim().length < 2) { container.innerHTML = ''; return; }
  try {
    const result = await searchUsers(query.trim());
    container.innerHTML = result.data.users.map(user => `<a class="explore-user" href="/pages/profile.html?id=${user._id}"><span class="mini-avatar">${escapeHtml((user.username || '?')[0].toUpperCase())}</span><span><strong>${escapeHtml(user.username)}</strong><small>${escapeHtml(user.name || 'MiniSocial member')}</small></span></a>`).join('') || '<p class="muted-text">No people found.</p>';
  } catch (error) { container.innerHTML = `<p class="muted-text">${escapeHtml(error.message)}</p>`; }
}

async function loadExplore() {
  const grid = document.getElementById('explore-grid');
  try {
    const result = await fetchExplore();
    if (!result.success) return;
    grid.innerHTML = result.data.posts.map(post => {
      const media = post.mediaType === 'video' && post.image ? `<video src="${post.image.url}" muted loop autoplay playsinline></video>` : post.image ? `<img src="${post.image.url || `/uploads/${post.image}`}" loading="lazy" alt="Explore post">` : `<div class="explore-text">${escapeHtml(post.content || '')}</div>`;
      return `<a class="explore-tile" href="/pages/profile.html">${media}<span class="explore-overlay">♥ ${post.likes?.length || 0} &nbsp; ▱ ${post.comments?.length || 0}</span></a>`;
    }).join('') || '<div class="empty-state"><span>✦</span><h2>Nothing to explore yet</h2><p>New posts will appear here.</p></div>';
  } catch (error) { grid.innerHTML = `<div class="empty-state"><h2>Explore is unavailable</h2><p>${escapeHtml(error.message)}</p></div>`; }
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
