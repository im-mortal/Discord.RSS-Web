const DiscordRSS = require('discord.rss')
const Article = DiscordRSS.Article
const FeedFetcher = DiscordRSS.FeedFetcher
const FailRecord = DiscordRSS.FailRecord
const Feed = DiscordRSS.Feed
const FeedData = DiscordRSS.FeedData
const configServices = require('./config.js')

/**
 * @param {import('discord.rss').Feed} feed
 */
async function getFeedPlaceholders (feed) {
  const { articleList } = await FeedFetcher.fetchFeed(feed.url)
  const allPlaceholders = []
  if (articleList.length === 0) {
    return allPlaceholders
  }
  const feedData = await FeedData.ofFeed(feed)
  for (const article of articleList) {
    const parsed = new Article(article, feedData)
    allPlaceholders.push(parsed.toJSON())
  }
  return allPlaceholders
}

/**
 *
 * @param {string} feedURL
 */
async function getAnonymousFeedPlaceholders (feedURL) {
  const feedConfig = await configServices.getFeedConfig()
  const dummyFeed = new Feed({
    ...feedConfig,
    guild: '1',
    channel: '1',
    url: feedURL
  })
  return module.exports.getFeedPlaceholders(dummyFeed)
}

/**
 * @param {string} guildID
 * @param {string} feedID
 * @returns {Feed|null}
 */
async function getFeedOfGuild (guildID, feedID) {
  return Feed.getByQuery({
    _id: feedID,
    guild: guildID
  })
}

/**
 * @param {Object<string, any>} data
 */
async function createFeed (data) {
  const feed = new Feed(data)
  await feed.testAndSave()
  return feed.toJSON()
}

/**
 * @param {string} feedID
 * @param {Object<string, any>} data
 */
async function editFeed (feedID, data) {
  const feed = await Feed.get(feedID)
  for (const key in data) {
    feed[key] = data[key]
  }
  await feed.save()
  return feed.toJSON()
}

/**
 * @param {string} feedID
 */
async function deleteFeed (feedID) {
  const feed = await Feed.get(feedID)
  if (!feed) {
    return
  }
  await feed.delete()
}

/**
 * @param {import('../../structs/db/Feed.js')} feed
 * @param {string} feedID
 */
async function getDatabaseArticles (feed, shardID) {
  // Schedule name must be determined
  const schedule = await feed.determineSchedule()
  const data = await DiscordRSS.models.Article.Model.find({
    scheduleName: schedule.name,
    feedURL: feed.url,
    shardID
  }).lean().exec()
  return data
}

/**
 * @param {string} url
 */
async function getFailRecord (url) {
  const record = await FailRecord.getBy('url', url)
  return record ? record.toJSON() : null
}

/**
 * @param {string} guildID
 */
async function getFeedsOfGuild (guildID) {
  const feeds = await Feed.getManyBy('guild', guildID)
  return feeds.map(f => f.toJSON())
}

module.exports = {
  getAnonymousFeedPlaceholders,
  getFeedPlaceholders,
  getFeedOfGuild,
  createFeed,
  editFeed,
  deleteFeed,
  getDatabaseArticles,
  getFailRecord,
  getFeedsOfGuild
}
