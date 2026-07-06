// Extracts the YouTube channel name from the current page and responds to
// background.js queries. Extraction runs on demand when the background service
// worker asks for the channel, so no MutationObserver is needed — this avoids
// re-querying the DOM on every one of YouTube's very frequent mutations.

let currentChannel = null;

function extractChannel() {
  // Video page: author shown under the video
  const videoAuthor =
    document.querySelector('ytd-video-owner-renderer #channel-name a') ||
    document.querySelector('#owner #channel-name a') ||
    document.querySelector('ytd-channel-name a');

  if (videoAuthor) {
    currentChannel = videoAuthor.textContent.trim() || null;
    return;
  }

  // Channel page: channel name in header
  const channelHeader =
    document.querySelector('ytd-channel-name yt-formatted-string') ||
    document.querySelector('#channel-header-container #channel-name');

  currentChannel = channelHeader ? channelHeader.textContent.trim() || null : null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'get_channel') {
    extractChannel();
    sendResponse({ channel: currentChannel });
  }
});
