// adapted from https://github.com/Jaaneek/useFilePicker
import { Dispatch, SetStateAction } from "react";
import { useFilePicker } from "use-file-picker";
import {
  FileAmountLimitValidator,
  FileSizeValidator,
} from "use-file-picker/validators";

export interface FilePickerProps {
  readonly setUpload: Dispatch<SetStateAction<string>>;
  readonly setFile: Dispatch<SetStateAction<Blob | undefined>>;
}

export default function FilePicker({ setUpload, setFile }: FilePickerProps) {
  const { openFilePicker, loading, errors } = useFilePicker({
    readAs: "DataURL",
    accept: [".html"],
    multiple: false,
    validators: [
      new FileAmountLimitValidator({ max: 1 }),
      new FileSizeValidator({ maxFileSize: 2 * 1024 * 1024 /* 2 MB */ }),
    ],
    onFilesSuccessfullySelected: ({ plainFiles }) => {
      // this callback is called when there were no validation errors
      const userFile = plainFiles[0];
      setUpload(userFile.name);
      // API call to add the html file of bookmarks
      // api.import()...
      setFile(userFile);
      // handle adding each bookmark returned to frontend or rerender
    },
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (errors.length) {
    return <div>Error...</div>;
  }
  return (
    <button className="btn btn-outline-info" onClick={() => openFilePicker()} title = "Import Bookmarks">
      <i className="bi bi-arrow-bar-up"> Upload File</i>
    </button>
  );
}
