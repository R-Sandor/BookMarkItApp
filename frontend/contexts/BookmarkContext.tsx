import api from "@/api/Api";
import BookmarkAction from "@/types/Bookmarks/BookmarkAction";
import Bookmark from "@type/Bookmarks/Bookmark";
import {
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  useRef,
} from "react";

interface ProviderProps {
  values: Bookmark[];
  loading: boolean;
}
export const BookmarkContext = createContext<ProviderProps>({
  values: [],
  loading: true,
});
export const BookmarkDispatchContext = createContext<Dispatch<BookmarkAction>>(
  () => {},
);

export function useBookmarks() {
  return useContext(BookmarkContext);
}

export function useBookmarkDispatch() {
  return useContext(BookmarkDispatchContext);
}

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, dispatch] = useReducer(bookmarkReducer, []);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (bookmarks.length == 0 && !hasFetched.current) {
      hasFetched.current = true;
      api.getAllBookmarks().then((resp) => {
        dispatch({ type: "add", bookmarks: resp.data as Bookmark[] });
        setIsLoading(false);
      });
    }
  }, []);

  return (
    <BookmarkContext.Provider value={{ values: bookmarks, loading: isLoading }}>
      <BookmarkDispatchContext.Provider value={dispatch}>
        {children}
      </BookmarkDispatchContext.Provider>
    </BookmarkContext.Provider>
  );
}

function bookmarkReducer(bookmarkList: Bookmark[], action: BookmarkAction) {
  switch (action.type) {
    case "add": {
      if (action.bookmarks) {
        console.log("adding");
        return [...bookmarkList, ...action.bookmarks];
      }
      return [...bookmarkList];
    }
    case "delete": {
      console.log("DELETE");
      if (action.bookmarkId) {
        const id = parseInt(action.bookmarkId.toString());
        api.deleteBookmarkById(id);
      }
      return [...bookmarkList.filter((b) => b.id !== action.bookmarkId)];
    }
    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}
