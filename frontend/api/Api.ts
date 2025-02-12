import authService from "@services/auth.service";
import { NewBookmarkRequest } from "@type/Bookmarks/NewBookmark";
import UpdateBmkReq from "@type/Bookmarks/UpdateBmkRequest";
import axios from "axios";
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL + "/api";

let failCount = 0;
export interface PaginatedBookmarkReq {
  page: number;
  size: number;
}
export interface Bookmark {
  id: number;
  title: string;
  url: string;
}
export interface PaginatedBookmarkRes {
  bookmarks: Bookmark[];
  total: number;
}

export const instance = axios.create({
  withCredentials: true,
  baseURL: SERVER_URL,
  timeout: 10000,
  transformResponse: [
    function (data: any) {
      return parseData(data);
    },
  ],
});

instance.interceptors.response.use(
  (response) => {
    failCount = 0;
    return response;
  },
  (error) => {
    if (error.response.status === 401) {
      console.log("Error on fetch");
      if (failCount > 1) {
        authService.logout();
        failCount = 0;
        return error;
      }
      const user = authService.getUser();
      if (user == null) {
        authService.logout();
        failCount = 0;
      }
      failCount++;
      api.refreshToken(user!.refreshToken);
    } else {
      // propagate the error.
      return error;
    }
  },
);

function parseData(data: string) {
  if (data.length != 0 || data || data != "") {
    return JSON.parse(data);
  }
  return data;
}

const api = {
  async execute(
    method: string,
    resource: string,
    data: any,
    config: {} | undefined,
  ) {
    return instance({
      method: method,
      url: resource,
      data,
      ...config,
    });
  },
  // Get all bookmarks.
  getAllBookmarks() {
    return this.execute("GET", "bookmarks", null, {});
  },
  // Get paginated bookmarks.
  getPaginatedBookmarks(req: PaginatedBookmarkReq) {
    return instance.get<PaginatedBookmarkRes>("bookmarks", {
      params: { page: req.page, size: req.size },
    });
  },
  // Delete all bookmarks.
  removeAllBookmarks() {
    return instance.delete("bookmarks");
  },
  // Gets a bookmark by ID.
  getBookmarkById(id: number) {
    return instance.get("bookmark", {
      params: { id: id },
    });
  },
  async exportAllBookmarks() {
    const response = await axios({
      method: "GET",
      url: SERVER_URL + "/bookmarks/export",
      responseType: "blob",
      withCredentials: true,
    });
    const href = URL.createObjectURL(response.data);
    // create "a" HTML element with href to file & click
    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("download", "findfirst-bookmarks.html"); //or any other extension
    document.body.appendChild(link);
    link.click();
    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  },
  // Adds a bookmark containing a list of tag Ids if any.
  addBookmark(bkmkReq: NewBookmarkRequest) {
    return instance.post("bookmark", bkmkReq);
  },
  // Deletes a bookmark by ID.
  deleteBookmarkById(id: number) {
    return instance.delete("bookmark", {
      params: { id: id },
    });
  },
  // Adds a list of new bookmarks.
  addBookmarks(bkmks: NewBookmarkRequest[]) {
    return instance.post("bookmark/addBookmarks", bkmks);
  },
  // Adds a tag to an existing bookmark by bookmark Id with just string title of tag.
  addBookmarkTag(bkmkId: number, title: string) {
    return instance.post(`bookmark/${bkmkId}/tag?tag=${title}`);
  },
  // Adds an existing tag to an existing bookmark by ids.
  addTagById(bkmkId: number, tagId: number) {
    return instance.post(`bookmark/${bkmkId}/tagId?tagId=${tagId}`);
  },
  // Deletes a tag from an existing bookmark using the bookmarkId and tag's title.
  deleteTagFromBookmark(bkmkId: number, title: string) {
    return instance.delete(`bookmark/${bkmkId}/tag?tag=${title}`);
  },
  // Deletes a tag from an existing bookmark using the bookmarkId and tag ID.
  deleteTagById(bkmkId: number, tagId: number) {
    return instance.delete(`bookmark/${bkmkId}/tagId?tagId=${tagId}`);
  },
  // Gets all tags
  getAllTags() {
    return this.execute("GET", "tags", null, {});
  },
  // Create a tag no bookmark yet.
  addAllTag(strTags: string[]) {
    return this.execute("POST", "tags", strTags, {});
  },
  // Deletes all tags from bookmarks.
  deleteAllTags() {
    return instance.delete("tags");
  },
  // Creates a new tag by title.
  addTag(title: string) {
    return instance(`tag?tag=${title}`);
  },
  // Gets a tag by ID.
  getTagById(id: string) {
    return this.execute("GET", "tags/id/" + id, null, {});
  },
  // Returns all the tags that belong to a particular bookmark.
  getAllTagsBelongingToBkmk(bkmkId: number) {
    return instance.get(`tag/bkmk?bookmarkId=${bkmkId}`);
  },
  refreshToken(token: string) {
    return instance.post(`refreshToken/token?token=${token}`);
  },
  searchBookmarkByTitleKeywords(keywords: string) {
    return instance.get("search/title", {
      params: {
        keywords: keywords,
      },
    });
  },
  searchBookmarkByTags(tags: string) {
    return instance.get(`search/tags?tags=${tags}`);
  },
  searchBookmarkByText(text: string) {
    return instance.get(`search/text?text=${text}`);
  },
  updateBookmark(update: UpdateBmkReq) {
    return instance.patch("bookmark", update);
  },
};

export default api;
