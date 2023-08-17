package dev.findfirst.bookmarkit.service;

import dev.findfirst.bookmarkit.model.Tag;
import dev.findfirst.bookmarkit.model.TagCntRecord;
import dev.findfirst.bookmarkit.repository.TagRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TagService {

  @Autowired TagRepository tagRepository;

  public void addTag(Tag tag) {
    tagRepository.saveAndFlush(tag);
  }

  public void addAll(List<Tag> tags) {
    tagRepository.saveAllAndFlush(tags);
  }

  public void deleteAllTags() {
    tagRepository.deleteAll();
  }

  public void deleteTag(Tag tag) {
    tagRepository.delete(tag);
  }

  public List<Tag> getTags() {
    return tagRepository.findAll();
  }

  public List<TagCntRecord>  getTagsWithCnt() { 
    return tagRepository.customTagsWithCnt();
  }
}
