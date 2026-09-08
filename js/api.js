const API_BASE = 'https://mini-social-media-app-backend-peach.vercel.app/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function getUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : {};

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }

    return { success: true, data };
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Server is not reachable. Please check if the backend is running.');
    }
    throw new Error(error.message || 'An unexpected error occurred');
  }
}

// Auth endpoints
async function registerUser(userData) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

async function loginUser(credentials) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

async function getCurrentUser() {
  return apiFetch('/auth/me');
}

async function deleteAccount() {
  return apiFetch('/auth/account', { method: 'DELETE' });
}

async function updateProfileApi(data) {
  return apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Post endpoints
async function createPost(data) {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return apiFetch('/posts', {
    method: 'POST',
    body,
  });
}

async function deletePost(postId) {
  return apiFetch(`/posts/${postId}`, {
    method: 'DELETE',
  });
}

async function fetchPosts(page = 1, limit = 10) {
  return apiFetch(`/posts?page=${page}&limit=${limit}`);
}

async function fetchSinglePost(postId) {
  return apiFetch(`/posts/${postId}`);
}

// Comment endpoints
async function addComment(postId, content) {
  return apiFetch(`/comments/${postId}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

async function deleteComment(commentId) {
  return apiFetch(`/comments/${commentId}`, {
    method: 'DELETE',
  });
}

async function fetchComments(postId, page = 1, limit = 20) {
  return apiFetch(`/comments/${postId}?page=${page}&limit=${limit}`);
}

// Interaction endpoints
async function likePost(postId) {
  return apiFetch(`/interactions/like/${postId}`, {
    method: 'POST',
  });
}

async function unlikePost(postId) {
  return apiFetch(`/interactions/like/${postId}`, {
    method: 'DELETE',
  });
}

async function followUser(userId) {
  return apiFetch(`/interactions/follow/${userId}`, {
    method: 'POST',
  });
}

async function unfollowUser(userId) {
  return apiFetch(`/interactions/follow/${userId}`, {
    method: 'DELETE',
  });
}

async function fetchFeed(page = 1, limit = 10) {
  return apiFetch(`/posts/feed?page=${page}&limit=${limit}`);
}

async function fetchSuggestions() {
  return apiFetch('/interactions/suggestions');
}

async function fetchNotifications() {
  return apiFetch('/interactions/notifications');
}

async function checkFollowStatus(userId) {
  return apiFetch(`/interactions/follow-status/${userId}`);
}

// User endpoints
async function searchUsers(query) {
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
}

async function fetchExplore() {
  return apiFetch('/posts/explore');
}

async function getUserProfile(userId) {
  return apiFetch(`/users/profile/${userId}`);
}

async function fetchMyFollowers() {
  return apiFetch(`/users/profile/${getUser()._id}/followers`);
}

async function fetchUserFollowers(userId) {
  return apiFetch(`/users/profile/${userId}/followers`);
}

async function fetchUserPosts(userId) {
  return apiFetch(`/posts/user/${userId}`);
}

async function fetchSavedPosts() {
  return apiFetch('/posts/saved');
}