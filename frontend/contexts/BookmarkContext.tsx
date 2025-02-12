"use client";


import api from "@/api/Api";
import BookmarkAction from "@/types/Bookmarks/BookmarkAction";
import UseAuth from "@components/UseAuth";
import Bookmark from "@type/Bookmarks/Bookmark";
import {
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  useMemo,
} from "react";
interface ProviderProps {
  fetchedBookmarks: Bookmark[];
  loading: boolean;
}

export const BookmarkContext = createContext<ProviderProps>({
  fetchedBookmarks: [],
  loading: true,
});

export const BookmarkDispatchContext = createContext<Dispatch<BookmarkAction>>(
  () => {}
);

export function useBookmarks() {
  return useContext(BookmarkContext);
}

export function useBookmarkDispatch() {
  return useContext(BookmarkDispatchContext);
}

export function BookmarkProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [bookmarks, dispatch] = useReducer(bookmarkReducer, []);
  const [isLoading, setIsLoading] = useState(true);
  const userAuth = UseAuth();

  useEffect(() => {
    if (userAuth && bookmarks.length === 0) {
      setIsLoading(true); 
      api
        .getAllBookmarks()
        .then((resp) => {
          dispatch({ type: "add", bookmarks: resp.data as Bookmark[] });
        })
        .finally(() => setIsLoading(false));
    }
  }, [bookmarks.length, userAuth]);

  useEffect(() => {
    return () => {
      dispatch({
        type: "reset",
        bookmarks: [],
      });
    };
  }, [userAuth]);

  const value = useMemo(
    () => ({ fetchedBookmarks: bookmarks, loading: isLoading }),
    [bookmarks, isLoading]
  );

  return (
    <BookmarkContext.Provider value={value}>
      <BookmarkDispatchContext.Provider value={dispatch}>
        {children}
      </BookmarkDispatchContext.Provider>
    </BookmarkContext.Provider>
  );
}

function bookmarkReducer(bookmarkList: Bookmark[], action: BookmarkAction) {
  switch (action.type) {
    case "add": {
      return [...bookmarkList, ...action.bookmarks];
    }
    case "delete": {
      if (action.bookmarkId) {
        const id = parseInt(action.bookmarkId.toString());
        api.deleteBookmarkById(id);
      }
      return bookmarkList.filter((b) => b.id !== action.bookmarkId);
    }
    case "reset": {
      return [];
    }
    case "search": {
      return action.bookmarks;
    }
    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}
