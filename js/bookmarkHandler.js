'use strict'

// bookmark, traversal bookmarkTreeNode to get all valid channel
class BookmarkHandler {
  get (id, callback) {
    // id: A single string-valued id, or an array of string-valued ids
    chrome.bookmarks.get(id, callback)
  }

  search (query, callback) {
    // query: string or object query. Attention: only when query.title == bookmark.title
    // but query.url will be split by ",", "."...except number or alphabet
    // query.title = 'Bookmarks bar' return [], use get(0, callback) instead.
    chrome.bookmarks.search(query, callback)
  }

  create (bookmark, callback) {
    // bookmark = {
    //  parentId: string(optional), // Defaults to the Other Bookmarks folder.
    //  index: integer(optional),
    //  title: string(optional),
    //  url: string(optional) // If url is NULL or missing, it will be a folder
    // }
    chrome.bookmarks.create(bookmark, callback)
  }
}
