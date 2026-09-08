let profileUserId = null;
let isFollowing = false;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id') || getUser()._id;
  profileUserId = userId;
  loadProfile(userId);
  if (userId === getUser()._id) loadNotifications();
  if (params.get('tab')) {
    switchProfileTab(params.get('tab'));
  }
});

async function loadProfile(userId) {
  try {
    const result = await getUserProfile(userId);
    if (result.success) {
      const user = result.data.user;
      const currentUser = getUser();
      const profileId = String(user._id);
      const currentUserId = String(currentUser._id || '');
      document.getElementById('profile-avatar').textContent = user.username.charAt(0).toUpperCase();
      document.getElementById('profile-username').textContent = user.username;
      document.getElementById('profile-name').textContent = user.name || '';
      document.getElementById('edit-name').value = user.name || '';
      document.getElementById('edit-username').value = user.username || '';
      document.getElementById('profile-bio').textContent = user.bio || 'No bio yet';
      document.getElementById('edit-bio').value = user.bio || '';
      document.getElementById('stat-posts-profile').textContent = Number(user.posts) || 0;
      document.getElementById('stat-followers-profile').textContent = Number(user.followers) || 0;
      document.getElementById('stat-following-profile').textContent = Number(user.following) || 0;
      isFollowing = user.followedByMe || false;
      const ownProfile = user.isOwnProfile || profileId === currentUserId;
      document.getElementById('edit-profile-btn').classList.toggle('hidden', !ownProfile);
      document.getElementById('follow-btn').classList.toggle('hidden', ownProfile);
      document.getElementById('profile-create-panel').classList.toggle('visible', ownProfile);
      document.getElementById('followers-stat-button').disabled = false;
      updateFollowButton();
      loadUserPosts(userId);
    }
  } catch (error) { console.error('Error loading profile:', error); }
}

async function loadNotifications() {
  const container = document.getElementById('notifications-list');
  if (!container || !getUser()._id) return;
  try {
    const result = await fetchNotifications();
    if (!result.success || !result.data.notifications.length) return;
    container.innerHTML = result.data.notifications.map(item => `<button class="notification-item" onclick="openNotificationPost('${item.post?._id || ''}')"><span class="notification-icon">${item.type === 'like' ? '♥' : item.type === 'comment' ? '▱' : '+'}</span><span><strong>${escapeHtml(item.actor?.username || 'Someone')}</strong> ${escapeHtml(item.message.replace(`${item.actor?.username || ''} `, ''))}<small>${getTimeAgo(new Date(item.createdAt))}</small></span></button>`).join('');
  } catch (error) { container.innerHTML = '<p class="muted-text">Activity is temporarily unavailable.</p>'; }
}

function updateFollowButton() {
  const btn = document.getElementById('follow-btn');
  if (btn) {
    btn.textContent = isFollowing ? 'Unfollow' : 'Follow';
    btn.className = `btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm`;
  }
}

async function toggleFollow() {
  try {
    if (isFollowing) { await unfollowUser(profileUserId); isFollowing = false; }
    else { await followUser(profileUserId); isFollowing = true; }
    const result = await getUserProfile(profileUserId);
    if (result.success) {
      const user = result.data.user;
      document.getElementById('stat-followers-profile').textContent = Number(user.followers) || 0;
      updateFollowButton();
    }
  } catch (error) { console.error('Error toggling follow:', error); }
}

function toggleEditProfile() { document.getElementById('edit-profile-form').classList.toggle('hidden'); }

async function updateProfile() {
  const name = document.getElementById('edit-name').value.trim();
  const username = document.getElementById('edit-username').value.trim();
  const bio = document.getElementById('edit-bio').value;
  const errorEl = document.getElementById('profile-edit-error');
  errorEl.classList.add('hidden');
  if (username.length < 3) {
    errorEl.textContent = 'Username must be at least 3 characters long.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    errorEl.textContent = 'Username can contain only letters, numbers, underscores, and dots.';
    errorEl.classList.remove('hidden');
    return;
  }
  try {
    const result = await updateProfileApi({ name, username, bio });
    if (result.success) {
      setUser({ ...getUser(), ...result.data.user });
      toggleEditProfile();
      document.getElementById('profile-username').textContent = result.data.user.username;
      document.getElementById('profile-name').textContent = result.data.user.name || '';
      document.getElementById('profile-bio').textContent = result.data.user.bio || 'No bio yet';
    }
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  }
}

async function loadUserPosts(userId) {
  try {
    const result = await fetchUserPosts(userId);
    if (result.success) {
      const container = document.getElementById('user-posts');
      if (!container) return;
      container.innerHTML = '';
      const userPosts = result.data.posts;
      window.profilePosts = userPosts;
      if (!userPosts.length) {
        container.innerHTML = '<div class="empty-state"><span>▦</span><h2>No posts yet</h2><p>Share something with your community.</p></div>';
        return;
      }
      userPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'profile-grid-item profile-tile';
        card.onclick = () => openPostModal(post);
        card.dataset.type = post.mediaType === 'video' ? 'reels' : 'posts';
        const media = post.mediaType === 'video' && post.image
          ? `<video src="${post.image.url}" muted loop playsinline controls></video>`
          : post.image
          ? `<img src="${post.image.url || `/uploads/${post.image}`}" alt="${escapeHtml(post.content || 'Post')}" loading="lazy">`
          : `<div class="tile-text">${escapeHtml(post.content || '')}</div>`;
        const isLiked = post.isLiked;
        const likeCount = post.likeCount || 0;
        card.innerHTML = `
          ${media}<div class="tile-overlay"><strong>${isLiked ? '♥' : '♡'} ${likeCount} likes</strong><span>▢ ${post.comments ? post.comments.length : 0} comments</span></div>`;
        container.appendChild(card);
      });
      const requestedTab = new URLSearchParams(window.location.search).get('tab');
      if (requestedTab) switchProfileTab(requestedTab);
    }
  } catch (error) { console.error('Error loading user posts:', error); }
}

async function followUserById(userId) {
  try {
    if (isFollowing) { await unfollowUser(userId); isFollowing = false; }
    else { await followUser(userId); isFollowing = true; }
    loadProfile(profileUserId);
  } catch (error) { console.error('Error following user:', error); }
}

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function getTimeAgo(date) { const s = Math.floor((new Date()-date)/1000); if(s<60) return 'just now'; const m=Math.floor(s/60); if(m<60) return `${m}m ago`; const h=Math.floor(m/60); if(h<24) return `${h}h ago`; const d2=Math.floor(h/24); return `${d2}d ago`; }

function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  document.querySelectorAll('.profile-tile').forEach(tile => {
    tile.classList.toggle('hidden', tab === 'saved' || (tab === 'reels' && tile.dataset.type !== 'reels'));
  });
  if (tab === 'saved') {
    loadSavedPosts();
  } else if (!document.querySelector('.profile-tile:not(.hidden)')) {
    document.getElementById('user-posts').innerHTML = `<div class="empty-state"><span>${tab === 'reels' ? '▶' : '▦'}</span><h2>No ${tab} yet</h2><p>Share something with your community.</p></div>`;
  }
}

async function openFollowersModal() {
  const modal = document.getElementById('followers-modal');
  const list = document.getElementById('followers-list');
  if (!modal || !profileUserId) return;
  modal.classList.remove('hidden');
  list.innerHTML = '<p class="muted-text">Loading followers...</p>';
  try {
    const result = await fetchUserFollowers(profileUserId);
    const followers = result.data.followers || [];
    list.innerHTML = followers.length ? followers.map(follower => {
      const username = follower.username || 'user';
      const name = follower.name || 'MiniSocial member';
      const followerId = follower._id || '';
      return `<a class="follower-item" href="/pages/profile.html?id=${encodeURIComponent(followerId)}"><div class="follower-avatar">${escapeHtml(username.charAt(0).toUpperCase())}</div><div class="follower-copy"><strong>@${escapeHtml(username)}</strong><span>${escapeHtml(name)}</span></div></a>`;
    }).join('') : '<p class="muted-text">No followers yet. Share your profile to grow your community.</p>';
  } catch (error) {
    list.innerHTML = `<p class="muted-text">${escapeHtml(error.message)}</p>`;
  }
}

function closeFollowersModal() {
  document.getElementById('followers-modal')?.classList.add('hidden');
}

async function loadSavedPosts() {
  const container = document.getElementById('user-posts');
  try {
    const result = await fetchSavedPosts();
    const posts = result.data.posts || [];
    container.innerHTML = posts.length ? posts.map(post => `<button class="profile-tile" onclick='openPostModal(${JSON.stringify(post)})'><div class="tile-text">${escapeHtml(post.content || '')}</div><div class="tile-overlay">Saved post</div></button>`).join('') : '<div class="empty-state"><span>⌑</span><h2>No saved posts</h2><p>Posts you save will appear here.</p></div>';
  } catch (error) { container.innerHTML = `<div class="empty-state"><h2>Could not load saved posts</h2><p>${escapeHtml(error.message)}</p></div>`; }
}

function openNotificationPost(postId) {
  if (!postId) return;
  const post = (window.profilePosts || []).find(item => item._id === postId);
  if (post) openPostModal(post);
  else getPost(postId).then(result => openPostModal(result.data.post)).catch(() => {});
}

async function getPost(postId) { return apiFetch(`/posts/${postId}`); }

function openPostModal(post) {
  const mediaUrl = typeof post.image === 'string' ? `/uploads/${post.image}` : post.image?.url;
  const media = post.mediaType === 'video' && mediaUrl ? `<video src="${escapeHtml(mediaUrl)}" controls autoplay playsinline></video>` : mediaUrl ? `<img src="${escapeHtml(mediaUrl)}" alt="Post media">` : '';
  const likes = post.likes || [];
  document.getElementById('post-modal-content').innerHTML = `<div class="modal-media">${media}</div><div class="modal-post-copy"><strong>@${escapeHtml(post.user?.username || '')}</strong><p>${escapeHtml(post.content || '')}</p><div class="modal-engagement"><button id="modal-like-btn" onclick="toggleModalLike('${post._id}')">${post.isLiked ? '♥' : '♡'} ${likes.length} likes</button><button id="modal-comments-btn" onclick="toggleModalComments('${post._id}')">▱ ${post.comments?.length || 0} comments</button></div><div id="liked-by-list" class="liked-by-list">${formatLikedBy(likes)}</div><div id="modal-comments" class="modal-comments hidden"><p class="muted-text">Loading comments...</p></div><form class="modal-comment-form" onsubmit="submitModalComment(event, '${post._id}')"><input id="modal-comment-input" maxlength="500" placeholder="Add a comment..." required><button class="btn btn-primary btn-sm" type="submit">Post</button></form></div>`;
  document.getElementById('post-modal').classList.remove('hidden');
}

function formatLikedBy(likes) {
  if (!likes.length) return 'No likes yet';
  return `Liked by ${likes.slice(0, 8).map(like => `@${escapeHtml(like.username || 'user')}`).join(', ')}${likes.length > 8 ? ` and ${likes.length - 8} more` : ''}`;
}

async function loadModalComments(postId) {
  try {
    const result = await fetchComments(postId, 1, 100);
    const comments = result.data.comments || [];
    const container = document.getElementById('modal-comments');
    if (!container) return;
    container.innerHTML = comments.length ? comments.map(comment => `<p class="modal-comment"><strong>@${escapeHtml(comment.user?.username || 'user')}</strong> ${escapeHtml(comment.content)}<small>${getTimeAgo(new Date(comment.createdAt))} · ${comment.likeCount || 0} likes</small></p>`).join('') : '<p class="muted-text">No comments yet.</p>';
  } catch (error) {
    const container = document.getElementById('modal-comments');
    if (container) container.innerHTML = `<p class="muted-text">${escapeHtml(error.message)}</p>`;
  }
}

async function toggleModalComments(postId) {
  const container = document.getElementById('modal-comments');
  const button = document.getElementById('modal-comments-btn');
  if (!container) return;
  const isOpening = container.classList.toggle('hidden') === false;
  if (button) button.textContent = `${isOpening ? '▾ Hide' : '▱'} comments`;
  if (isOpening) {
    await loadModalComments(postId);
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function toggleModalLike(postId) {
  const post = (window.profilePosts || []).find(item => item._id === postId);
  if (!post) return;
  try {
    const result = post.isLiked ? await unlikePost(postId) : await likePost(postId);
    post.isLiked = !post.isLiked;
    post.likeCount = result.data.likeCount;
    const currentUser = getUser();
    post.likes = post.isLiked
      ? [...(post.likes || []), { _id: currentUser._id, username: currentUser.username }]
      : (post.likes || []).filter(like => String(like._id) !== String(currentUser._id));
    const button = document.getElementById('modal-like-btn');
    if (button) button.textContent = `${post.isLiked ? '♥' : '♡'} ${post.likeCount} likes`;
    const likedBy = document.getElementById('liked-by-list');
    if (likedBy) likedBy.textContent = formatLikedBy(post.likes);
  } catch (error) { console.error('Error toggling modal like:', error); }
}

async function submitModalComment(event, postId) {
  event.preventDefault();
  const input = document.getElementById('modal-comment-input');
  if (!input?.value.trim()) return;
  try {
    await addComment(postId, input.value.trim());
    input.value = '';
    document.getElementById('modal-comments')?.classList.remove('hidden');
    await loadModalComments(postId);
  } catch (error) { console.error('Error adding modal comment:', error); }
}

function closePostModal() { document.getElementById('post-modal').classList.add('hidden'); }

function chooseMedia(type) {
  document.getElementById(type === 'video' ? 'reel-media-input' : 'post-media-input').click();
}

let selectedProfileMedia = null;
let selectedProfileMediaType = 'image';

function prepareProfileMedia(type, input) {
  const file = input.files[0];
  if (!file) return;
  selectedProfileMedia = file;
  selectedProfileMediaType = type === 'video' ? 'video' : 'image';
  const preview = document.getElementById('upload-preview');
  preview.classList.remove('hidden');
  const objectUrl = URL.createObjectURL(file);
  preview.innerHTML = selectedProfileMediaType === 'video'
    ? `<video src="${objectUrl}" controls muted></video>`
    : `<img src="${objectUrl}" alt="Selected media">`;
  document.getElementById('upload-media-btn').classList.remove('hidden');
  document.getElementById('upload-status').textContent = `${file.name} ready to publish.`;
}

async function publishProfileMedia() {
  if (!selectedProfileMedia) return;
  const file = selectedProfileMedia;
  const caption = document.getElementById('profile-post-caption').value.trim() || (selectedProfileMediaType === 'video' ? 'New reel' : 'New post');
  const formData = new FormData();
  formData.append('content', caption);
  formData.append('image', file);
  formData.append('mediaType', selectedProfileMediaType);
  formData.append('commentsEnabled', document.getElementById('comments-enabled').checked);
  formData.append('sharedToFeed', document.getElementById('share-enabled').checked);
  const status = document.getElementById('upload-status');
  status.textContent = 'Uploading...';
  try {
    const result = await createPost(formData);
    if (result.success) {
      status.textContent = selectedProfileMediaType === 'video' ? 'Reel uploaded to your profile and home feed.' : 'Post uploaded to your profile and home feed.';
      document.getElementById('profile-post-caption').value = '';
      document.getElementById('upload-preview').classList.add('hidden');
      document.getElementById('upload-media-btn').classList.add('hidden');
      selectedProfileMedia = null;
      await loadUserPosts(profileUserId);
      document.getElementById('stat-posts-profile').textContent = (window.profilePosts || []).length;
      switchProfileTab(selectedProfileMediaType === 'video' ? 'reels' : 'posts');
    }
  } catch (error) { status.textContent = error.message; }
}