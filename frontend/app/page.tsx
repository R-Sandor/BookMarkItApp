"use client";
import TagList from "@components/TagList";
import { TagCntProvider } from "contexts/TagContext";
import BookmarkGroup from "@/components/bookmark/BookmarkGroup";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import UseAuth from "@components/UseAuth";

export default function App() {
  const userAuth = UseAuth();

  /**
   * Ideally when the user visits the site they will actually have a cool landing page
   * rather than redirecting them immediately to sign in.
   * Meaning that the '/' will eventually be added to the public route and not authenticated will be the
   * the regular landing.
   */
  return userAuth ? (
    <BookmarkProvider>
      <TagCntProvider>
        <div className="row">
          <div className="col-md-4 col-lg-3">
            <TagList />
          </div>
          <div className="col-md-8 col-lg-9">
            <BookmarkGroup />
          </div>
        </div>
      </TagCntProvider>
    </BookmarkProvider>
  ) : (
    <div> Hello Welcome to BookmarkIt. </div>
  );
}
