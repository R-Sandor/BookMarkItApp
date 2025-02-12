import { useSelectedTags } from "@/contexts/SelectedContext";
import BookmarkCard from "@components/Bookmark/BookmarkCard";
import NewBookmarkCard from "@components/Bookmark/NewBookmarkCard";
import { useBookmarks } from "@/contexts/BookmarkContext";
import Bookmark from "@type/Bookmarks/Bookmark";
import { useTags } from "@/contexts/TagContext";
import { TagWithCnt } from "@type/Bookmarks/Tag";
import cardView from "styles/cardView.module.scss";
import { useState, useEffect, useRef } from "react";
import api, { PaginatedBookmarkReq, PaginatedBookmarkRes } from "@/api/Api";

function getTagId(map: Map<number, TagWithCnt>, tagTitle: string) {
  for (let [k, v] of map) {
    if (v.title === tagTitle) {
      return k;
    }
  }
  return -1;
}

// Bookmark group composed of Bookmarks.
export default function BookmarkCardsView() {

  const bookmarks = useBookmarks();  const { selected } = useSelectedTags();
  const tags = useTags();
  const [currentBookmarks, setCurrentBookmarks] = useState<Bookmark[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const size = 10;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterMap = useRef(new Map<number, Bookmark>());

  useEffect(() => {
    fetchPaginatedBookmarks(page, size);
  }, [page, selected]);

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    observerRef.current = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore]);
  function addIfNotInList(ids: number[]) {
    ids.forEach((bkmkId) => {
      const fnd = bookmarks.fetchedBookmarks.find((v) => v.id === bkmkId);
      if (fnd) filterMap.current.set(bkmkId, fnd);
    });
  }

  function filterBookmarks(bookmarks: Bookmark[], start = 0, end = ITEMS_PER_LOAD): Bookmark[] {
    if (selected.length === 0) {
      return bookmarks.slice(start, end);
    } else {
      selected.forEach((selectedTag) => {
        const key = getTagId(tags, selectedTag);
        if (key > 0) {
          const selectedBkmks = tags.get(key)?.associatedBkmks.map((v) => v.id);
          if (selectedBkmks) {
            addIfNotInList(selectedBkmks);
          }
        }
      });
      return [...filterMap.current.values()].slice(start, end);
    }
  }

  async function fetchPaginatedBookmarks(page: number, size: number) {
    try {
      const req: PaginatedBookmarkReq = { page, size };
      console.log("Request:", req);
      const response = await api.getPaginatedBookmarks(req);
      // console.log("Response:", response.data);
      // const res:PaginatedBookmarkRes = response.data;
      // console.log("Response:", res);
      const paginatedResponse: PaginatedBookmarkRes = {
        bookmarks: response.data.map((bookmark: Bookmark) => ({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          screenshotUrl: bookmark.screenshotUrl,
          tags: bookmark.tags,
          scrapable: bookmark.scrapable,
        })),
        total: response.data.length, 
      };
  
      // Log the transformed response
      console.log("Transformed Response:", paginatedResponse);
      setCurrentBookmarks((prev) => {
        const bookmarkMap = new Map<number, Bookmark>();
        [...prev, ...paginatedResponse.bookmarks].forEach((bookmark) => {
          bookmarkMap.set(bookmark.id, bookmark);
        });
        return Array.from(bookmarkMap.values());
      });
      console.log("Current Bookmarks:", currentBookmarks);

      setHasMore(paginatedResponse.bookmarks.length === size);
    } catch (error) {
      console.error("Error fetching paginated bookmarks:", error);
    }
  }

  return (
    <div>
      {!bookmarks.loading ? (
      <div className={`${cardView.content} row`}>
        <div className="col-sm-12 col-md-12 col-lg-4">
          <NewBookmarkCard />
        </div>
        {currentBookmarks.map((b) => (
          <div key={b.id} className="col-sml-12 col-md-6 col-lg-4">
            <BookmarkCard bookmark={b} />
          </div>
        ))}
        {hasMore && <div ref={sentinelRef} style={{ height: "1px", visibility: "hidden" }} />}
      </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
