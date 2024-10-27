package dev.findfirst.core.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.relational.core.mapping.Table;

@AllArgsConstructor
@Data
@Table
public class BookmarkTag {
  private long tagId;
  private long bookmarkId;
}
