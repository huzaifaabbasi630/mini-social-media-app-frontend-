async function likePostApi(postId) { return await likePost(postId); }
async function unlikePostApi(postId) { return await unlikePost(postId); }
async function followUserApi(userId) { return await followUser(userId); }
async function unfollowUserApi(userId) { return await unfollowUser(userId); }
async function checkFollowStatusApi(userId) { return await checkFollowStatus(userId); }