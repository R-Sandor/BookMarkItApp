import { Field, Form, Formik } from "formik";
import { useState } from "react";
import style from "./bookmarkCard.module.scss";
import api from "@/api/Api";
import Bookmark from "@/types/Bookmarks/Bookmark";
import { useBookmarkDispatch } from "@/contexts/BookmarkContext";
import BookmarkAction from "@/types/Bookmarks/BookmarkAction";
import { useTagsDispatch } from "@/contexts/TagContext";
import TagAction from "@/types/Bookmarks/TagAction";
import Tag from "@/types/Bookmarks/Tag";
import * as Yup from "yup";
import { tlds } from "@type/Bookmarks/TLDS";
import {
  NewBookmarkRequest,
  NewBookmarkForm,
  newcard,
} from "@type/Bookmarks/NewBookmark";
import { ToastContainer, toast } from "react-toastify";
import { AxiosError, AxiosResponse } from "axios";
import { ScrapableNewBookmarkToggle } from "./ScrapableToggle";

async function makeNewBookmark(createBmk: Bookmark): Promise<Bookmark> {
  let newBkmkRequest: NewBookmarkRequest = {
    title: createBmk.title,
    url: createBmk.url,
    tagIds: [],
    scrapable: createBmk.scrapable,
  };
  console.log(createBmk.scrapable);
  let tagTitles: string[] = createBmk.tags.map((t) => t.title);

  await api.addAllTag(tagTitles).then((response) => {
    let respTags: Tag[] = response.data;
    respTags.forEach((rt) => {
      newBkmkRequest.tagIds.push(rt.id);
    });
  });

  await api
    .addBookmark(newBkmkRequest)
    .then((response: AxiosError<any> | AxiosResponse) => {
      if (response.status === 409) {
        if (response instanceof AxiosError) {
          toast.error(response?.response?.data.error, {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        }
        return;
      }
      if (!(response instanceof AxiosError)) {
        // Update the bookmark with the response data
        createBmk.id = response.data.id;
        createBmk.tags = response.data.tags;
        createBmk.screenshotUrl = response.data.screenshotUrl;
        createBmk.scrapable = response.data.scrapable;
        createBmk.title = response.data.title;

        // Show a green success toast for a successful add
        toast.success("Bookmark added successfully!", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    });
  return createBmk;
}

export default function NewBookmarkCard() {
  const [urlInput, setUrlInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isScrapable, setIsScrapable] = useState(true);
  const [strTags, setStrTags] = useState<string[]>([]);
  const bkmkDispatch = useBookmarkDispatch();
  const tagDispatch = useTagsDispatch();

  const onTagInputChange = (e: any) => {
    setTagInput(e.target.value);
  };

  const urlInputChange = (e: any, setFieldValue: any) => {
    let url: string = e.target.value;
    if (url.length > 4 && !url.startsWith("http")) {
      url = "https://" + url;
    }
    setFieldValue("url", url, true);
    setUrlInput(url);
  };

  const handleOnSubmit = async (
    submittedBmk: NewBookmarkForm,
    actions: any,
  ) => {
    // Get the last inputted string and all the tags already entered.
    let tags: Tag[] = strTags.map((t) => ({ title: t, id: -1 }));
    if (tagInput) {
      tags.push({ title: tagInput, id: -1 });
    }
    submittedBmk.title = submittedBmk.url;
    let newBkmk: Bookmark = {
      id: -1,
      title: submittedBmk.title,
      url: submittedBmk.url,
      screenshotUrl: "",
      tags: tags,
      scrapable: isScrapable,
    };

    actions.resetForm({ newcard });
    setStrTags([]);
    setTagInput("");
    let retBkmk = await makeNewBookmark(newBkmk);
    // If adding the bookmark was successful, dispatch actions.
    if (retBkmk.id !== -1) {
      retBkmk.tags.forEach((t) => {
        let tAct: TagAction = {
          type: "add",
          id: t.id,
          title: t.title,
          bookmark: retBkmk,
        };
        tagDispatch(tAct);
      });

      let action: BookmarkAction = {
        type: "add",
        bookmarkId: retBkmk.id,
        bookmarks: [retBkmk],
      };
      bkmkDispatch(action);
    }
  };

  const handleOnReset = async () => {
    setStrTags([]);
    if (urlInput) {
      setUrlInput("");
    }
  };

  function onKeyDown(e: any, sv: any, values: NewBookmarkForm) {
    const { key } = e;
    const trimmedInput = tagInput.trim();
    if (
      // Add tag via space bar or enter
      (key === "Enter" || key === "Space" || key === " ") &&
      trimmedInput.length &&
      !strTags.includes(trimmedInput)
    ) {
      e.preventDefault();
      setStrTags((prevState) => [...prevState, trimmedInput]);
      values.tagTitles = strTags.concat(trimmedInput);
      setTagInput("");
    }
    // If backspace is pressed on an empty input field, remove the last tag.
    if (key === "Backspace" && !tagInput.length && strTags.length) {
      e.preventDefault();
      const tagsCopy = [...strTags];
      let poppedTag = tagsCopy.pop();

      values.tagTitles = tagsCopy;
      setStrTags(tagsCopy);
      if (poppedTag) {
        setTagInput(poppedTag);
      }
    }
    sv(values);
  }

  const deleteTag = (index: number, setField: any, values: NewBookmarkForm) => {
    const tags = strTags.filter((t, i) => i !== index);
    values.tagTitles = tags;
    setStrTags(tags);
    setField("tags", tags, true);
  };

  function stripHttp(fullUrl: string) {
    fullUrl = fullUrl.toLowerCase();
    return fullUrl.startsWith("https://")
      ? fullUrl.replace("https://", "")
      : fullUrl.replace("http://", "");
  }

  function getRootUrl(url: string) {
    return url.split("/")[0];
  }

  const bookmarkSchema = Yup.object().shape({
    url: Yup.string()
      .url()
      .required("Must be a valid URL")
      .min(3)
      .test("The TLD is valid", "The Domain must be valid.", (value) => {
        const url = stripHttp(value);
        const mainUrl = getRootUrl(url);
        const dots = mainUrl.split(".");
        const tld = dots[dots.length - 1];
        return tlds.includes(tld.toUpperCase());
      }),
    tagTitles: Yup.array().max(8, "Too many tags. Max 8.").optional(),
  });

  return (
    <div className={style.main}>
      <Formik
        initialValues={newcard}
        onSubmit={handleOnSubmit}
        onReset={handleOnReset}
        validateOnChange={true}
        validateOnBlur={true}
        validationSchema={bookmarkSchema}
      >
        {({ isValid, dirty, values, setValues, setFieldValue, errors }) => (
          <Form>
            <div className={`card ${style.newBookmarkCard} ${style.cardBody}`}>
              <div className="card-header">
                Add Bookmark <i className="bi bi-bookmarks-fill"></i>{" "}
              </div>
              <div className="card-body">
                <div className={`card-text ${style.title}`}>
                  <Field
                    className="form-control"
                    id="url"
                    name="url"
                    value={urlInput}
                    onChange={(e: any) => urlInputChange(e, setFieldValue)}
                    placeholder="url: https://findfirst.com/discover"
                    type="text"
                  />
                </div>
                {dirty ? (
                  <ScrapableNewBookmarkToggle
                    isScrapable={isScrapable}
                    setScrapable={setIsScrapable}
                    values={values}
                    setValues={setValues}
                  />
                ) : null}
              </div>
              <div className={`card-footer ${style.cardFooter} `}>
                <div className={style.container}>
                  {strTags.map((tag, index) => (
                    <button
                      key={tag}
                      onClick={() => deleteTag(index, setFieldValue, values)}
                      type="button"
                      data-testid={tag}
                      className={style.pillButton}
                    >
                      {tag}
                      <i className={`${style.xtag} bi bi-journal-x`}></i>
                    </button>
                  ))}
                  <input
                    value={tagInput}
                    className={style.input}
                    placeholder="Enter a tag"
                    onKeyDown={(e) => onKeyDown(e, setValues, values)}
                    onChange={onTagInputChange}
                    data-testid="new-bk-tag-input"
                  />
                </div>
                <button
                  disabled={!isValid || !dirty}
                  className={`${style.formButton}  ${style.submit}`}
                  type="submit"
                >
                  Submit
                </button>
                <button
                  className={`${style.formButton} ${style.reset}`}
                  type="reset"
                >
                  Reset
                </button>
                {errors.url ? (
                  <div className={style.errorText}>{errors.url}</div>
                ) : null}
                {errors.tagTitles && values.tagTitles ? (
                  <div className={style.errorText}>{errors.tagTitles}</div>
                ) : null}
              </div>
            </div>
          </Form>
        )}
      </Formik>
      <ToastContainer />
    </div>
  );
}
