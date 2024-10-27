package dev.findfirst.core.model;

import java.util.Date;
import java.util.List;

import lombok.Data;

/** Takes bookmarks and turns them into an html file in the form of a String. */
@Data
public class ExportBookmark {

  private StringBuilder htmlOut;

  private List<TagBookmarks> content;

  public ExportBookmark(List<TagBookmarks> tagBookmarks) {
    String defaultText =
        """
            <!DOCTYPE NETSCAPE-Bookmark-file-1>
            <!-- This is an automatically generated file.
            It will be read and overwritten.
            DO NOT EDIT! -->
            <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
            <meta http-equiv="Content-Security-Policy"  content="default-src 'self'; script-src 'none'; img-src data: *; object-src 'none'"></meta>
            <TITLE>FindFirst Bookmarks</TITLE>
            <H1>Bookmarks</H1>
            <DL><p>
            """;
    htmlOut = new StringBuilder(defaultText);
    content = tagBookmarks;
    buildHtml();
  }

  private void buildHtml() {
    content.forEach(tb -> {
      htmlOut.append(getCat(tb));
      htmlOut.append(getLinks(tb.bookmarks()));
      htmlOut.append(endCat());
    });
    htmlOut.append(endOfContent());
  }

  private String getCat(TagBookmarks tb) {
    Date date = tb.bookmarks().get(0).getCreatedDate();
    Long time = 0l;
    if (date != null) {
      time = date.getTime();
    }
    return """
          \n<DT><H3 ADD_DATE="%s" LAST_MODIFIED="%s">%s</H3>
          <DL><p>
        """.formatted(time.toString(), time.toString(), tb.tagTitle());
  }

  private String endCat() {
    return "\t</DL><p>";
  }

  private String endOfContent() {
    return "\n</DL>";
  }

  private StringBuilder getLinks(List<Bookmark> bkmks) {
    var links = new StringBuilder();
    bkmks.forEach(bkmk -> {
      Long addedTime = 0l;
      Long modTime = 0l;
      Date date = bkmk.getCreatedDate();
      if (date != null) {
        addedTime = bkmk.getCreatedDate().getTime();
        modTime = bkmk.getLastModifiedDate().getTime();
      }
      links.append("""
              <DT><A HREF="%s" ADD_DATE=%s LAST_MODIFIED=%s ICON_URI="%s">%s</A>
          """.formatted(bkmk.getUrl(), addedTime.toString(), modTime.toString(), bkmk.getUrl(),
          bkmk.getTitle()));
    });

    return links;
  }

  /** Convert all the TagBookmarks to an html file. */
  @Override
  public String toString() {
    return htmlOut.toString();
  }
}
