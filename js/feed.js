let currentPage = 1;
let hasMore = true;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (user._id) {
    const avatar = document.getElementById('post-avatar');
    if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
  }
  loadFeed();
  window.feedRefreshTimer = window.setInterval(() => refreshFeed(), 8000);
});

async function refreshFeed() {
  if (isLoading || document.hidden) return;
  try {
    const result = await fetchFeed(1, 10);
    if (result.success) {
      const container = document.getElementById('feed-container');
      if (!container) return;
      container.innerHTML = '';
      renderPosts(result.data.posts);
    }
  } catch (error) { console.error('Feed refresh error:', error); }
}

async function loadFeed() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.remove('hidden');

  try {
    const result = await fetchFeed(currentPage);
    if (result.success) {
      const { posts, pagination } = result.data;
      renderPosts(posts);
      if (currentPage === 1 && !posts.length) {
        const container = document.getElementById('feed-container');
        if (container) container.innerHTML = '<div class="empty-state"><span>✦</span><h2>Your feed is quiet</h2><p>Be the first to share a post with the community.</p></div>';
      }
      currentPage++;
      hasMore = currentPage <= pagination.pages;
    }
  } catch (error) {
    console.error('Error loading feed:', error);
    const container = document.getElementById('feed-container');
    if (container && currentPage === 1) container.innerHTML = `<div class="empty-state"><span>!</span><h2>Could not load your feed</h2><p>${escapeHtml(error.message)}</p></div>`;
  } finally {
    isLoading = false;
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function renderPosts(posts) {
  const container = document.getElementById('feed-container');
  if (!container) return;
  posts.forEach(post => {
    const postEl = createPostElement(post);
    container.appendChild(postEl);
  });
}

function createPostElement(post) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.dataset.postId = post._id;

  const isLiked = post.isLiked;
  const likeCount = post.likeCount || 0;
  const commentCount = post.comments ? post.comments.length : 0;
  const isOwnPost = post.user && post.user._id === getUser()._id;
  const username = post.user && post.user.username ? post.user.username : 'Unknown';
  const mediaUrl = typeof post.image === 'string' ? `/uploads/${post.image}` : post.image?.url;
  const timeAgo = getTimeAgo(new Date(post.createdAt));

  card.innerHTML = `
    <div class="post-header">
      <a class="avatar" href="/pages/profile.html?id=${post.user?._id || ''}">${escapeHtml(username.charAt(0).toUpperCase())}</a>
      <div class="user-info">
        <a class="username" href="/pages/profile.html?id=${post.user?._id || ''}">${escapeHtml(username)}</a>
        <div class="time">${timeAgo}</div>
      </div>
      ${!isOwnPost && post.user ? `<button class="btn btn-primary btn-sm feed-follow-btn" data-user-id="${post.user._id}" data-following="${Boolean(post.followedByMe)}" onclick="toggleFeedFollow('${post.user._id}')">${post.followedByMe ? 'Following' : 'Follow'}</button>` : ''}
    </div>
    <div class="post-content">${escapeHtml(post.content)}</div>
    ${post.mediaType === 'video' && mediaUrl ? `<video src="${escapeHtml(mediaUrl)}" class="post-image" controls playsinline preload="metadata"></video>` : mediaUrl ? `<img src="${escapeHtml(mediaUrl)}" class="post-image" alt="Post image" loading="lazy">` : ''}
    <div class="post-stats">
      <span id="like-count-${post._id}">👍 ${likeCount} likes</span>
      <span id="comment-count-${post._id}">💬 ${commentCount} comments</span>
    </div>
    <div class="post-actions-bar">
      <button class="${isLiked ? 'liked' : ''}" id="like-btn-${post._id}" onclick="toggleLike('${post._id}')">
        ${isLiked ? '❤️' : '🤍'} ${likeCount}
      </button>
      <button onclick="toggleComments('${post._id}')">
        💬 Comments
      </button>
      ${post.user && post.user._id === getUser()._id ? `<button onclick="removePost('${post._id}')">🗑️</button>` : ''}
    </div>
    <div id="comments-section-${post._id}" class="comments-section hidden">
      <div class="section-title">Comments</div>
      <div id="comments-list-${post._id}"></div>
      <div class="comment-form ${post.commentsEnabled === false ? 'hidden' : ''}">
        <input type="text" id="comment-input-${post._id}" placeholder="Write a comment...">
        <button class="btn btn-primary btn-sm" onclick="submitComment('${post._id}')">Post</button>
      </div>
    </div>
  `;
  return card;
}

async function toggleLike(postId) {
  const btn = document.getElementById(`like-btn-${postId}`);
  if (!btn) return;
  const isLiked = btn.classList.contains('liked');
  try {
    if (isLiked) {
      const result = await unlikePost(postId);
      btn.classList.remove('liked');
      btn.innerHTML = `🤍 ${result.data.likeCount}`;
      updateLikeCount(postId, result.data.likeCount);
    } else {
      const result = await likePost(postId);
      btn.classList.add('liked');
      btn.innerHTML = `❤️ ${result.data.likeCount}`;
      updateLikeCount(postId, result.data.likeCount);
    }
  } catch (error) {
    console.error('Error toggling like:', error);
  }
}

function updateLikeCount(postId, count) {
  const countEl = document.getElementById(`like-count-${postId}`);
  if (countEl) countEl.textContent = `👍 ${count} likes`;
}

async function toggleFeedFollow(userId) {
  const buttons = document.querySelectorAll(`.feed-follow-btn[data-user-id="${userId}"]`);
  const isFollowing = buttons[0]?.dataset.following === 'true';
  try {
    if (isFollowing) await unfollowUser(userId);
    else await followUser(userId);
    buttons.forEach(button => {
      button.dataset.following = String(!isFollowing);
      button.textContent = !isFollowing ? 'Following' : 'Follow';
      button.classList.toggle('btn-primary', isFollowing);
      button.classList.toggle('btn-secondary', !isFollowing);
    });
  } catch (error) {
    console.error('Error toggling feed follow:', error);
  }
}

async function toggleComments(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  if (!section) return;
  if (section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    await loadComments(postId);
  } else {
    section.classList.add('hidden');
  }
}

async function loadComments(postId) {
  try {
    const result = await fetchComments(postId, 1, 20);
    if (result.success) {
      const container = document.getElementById(`comments-list-${postId}`);
      if (!container) return;
      container.innerHTML = '';
      result.data.comments.forEach(comment => {
        const commentEl = createCommentElement(comment, postId);
        container.appendChild(commentEl);
      });
      const countEl = document.getElementById(`comment-count-${postId}`);
      if (countEl && result.data.pagination) countEl.textContent = `💬 ${result.data.pagination.total} comments`;
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

function createCommentElement(comment, postId) {
  const div = document.createElement('div');
  div.className = 'comment';
  const timeAgo = getTimeAgo(new Date(comment.createdAt));
  const isOwner = getUser()._id === comment.user._id;
  div.innerHTML = `
    <div class="avatar">${comment.user ? comment.user.username.charAt(0).toUpperCase() : '?'}</div>
    <div class="content">
      <div class="username">${comment.user ? comment.user.username : 'Unknown'}</div>
      <div class="text">${escapeHtml(comment.content)}</div>
      <div class="time">${timeAgo} ${isOwner ? `<button onclick="deleteComment('${comment._id}','${postId}')" style="margin-left:8px;color:var(--danger);border:none;background:none;cursor:pointer;font-size:0.8rem;">Delete</button>` : ''}</div>
    </div>
  `;
  return div;
}

async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input || !input.value.trim()) return;
  const content = input.value.trim();
  try {
    const result = await addComment(postId, content);
    if (result.success) {
      input.value = '';
      await loadComments(postId);
    }
  } catch (error) {
    console.error('Error adding comment:', error);
  }
}

async function deleteComment(commentId, postId) {
  try {
    const result = await deleteCommentApi(commentId);
    if (result.success) {
      await loadComments(postId);
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
  }
}

async function createPostFromComposer() {
  const contentEl = document.getElementById('post-content');
  if (!contentEl || !contentEl.value.trim()) return;
  const content = contentEl.value.trim();
  try {
    const result = await window.createPost({ content });
    if (result.success) {
      contentEl.value = '';
      const container = document.getElementById('feed-container');
      if (container) {
        const postEl = createPostElement(result.data.post);
        container.insertBefore(postEl, container.firstChild);
      }
    }
  } catch (error) {
    console.error('Error creating post:', error);
  }
}

async function removePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const result = await deletePost(postId);
    if (result.success) {
      const card = document.querySelector(`[data-post-id="${postId}"]`);
      if (card) card.remove();
    }
  } catch (error) {
    console.error('Error deleting post:', error);
  }
}

function searchUsersInput(query) {
  if (!query.trim() || query.length < 2) return;
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(async () => {
    try {
      const result = await searchUsers(query);
      if (result.success) {
        renderSearchResults(result.data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, 500);
}

function renderSearchResults(users) {
  const container = document.getElementById('search-results');
  if (!container) return;
  container.innerHTML = '';
  users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'user-result';
    const isFollowing = user.followedByMe;
    div.innerHTML = `
      <div class="user-info">
        <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
        <div><div style="font-weight:600;">${user.username}</div></div>
      </div>
      <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="followUserById('${user._id}')">${isFollowing ? 'Unfollow' : 'Follow'}</button>
    `;
    container.appendChild(div);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

document.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    loadFeed();
  }
});

window.addEventListener('beforeunload', () => {
  window.removeEventListener('scroll', loadFeed);
});