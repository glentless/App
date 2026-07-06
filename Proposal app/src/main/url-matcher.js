function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/\*/g, '.*'), 'i');
}

function matchesRule(rule, { url, channel }) {
  if (!rule.enabled) return false;

  const patterns = rule.urlPatterns || [];
  const keywords = rule.channelKeywords || [];

  const urlMatches = patterns.some((p) => globToRegExp(p).test(url));
  const channelMatches =
    channel && keywords.some((k) => channel.toLowerCase().includes(k.toLowerCase()));

  return urlMatches || channelMatches;
}

function findMatchingRule(rules, urlInfo) {
  return rules.find((rule) => matchesRule(rule, urlInfo)) || null;
}

module.exports = { matchesRule, findMatchingRule };
