package dev.findfirst.users.controller;

import static org.junit.Assert.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Optional;
import java.util.Properties;

import dev.findfirst.core.annotations.IntegrationTest;
import dev.findfirst.security.userauth.models.TokenRefreshResponse;
import dev.findfirst.security.userauth.models.payload.request.SignupRequest;
import dev.findfirst.users.model.MailHogMessage;
import dev.findfirst.users.model.user.TokenPassword;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@IntegrationTest
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-test.yml")
class UserControllerTest {

  final TestRestTemplate restTemplate;

  @Mock
  private UserManagementService userManagementService;

  @Autowired
  UserControllerTest(TestRestTemplate tRestTemplate) {
    this.restTemplate = tRestTemplate;
  }

  private MockMvc mockMvc;

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16.2-alpine3.19");

  @Container
  public static GenericContainer<?> mailhog =
      new GenericContainer<>(DockerImageName.parse("mailhog/mailhog:latest")).withExposedPorts(1025,
          8025);

  @TestConfiguration
  public static class JavaMailSenderConfiguration {
    @Bean
    public JavaMailSender javaMailSender() {
      JavaMailSenderImpl mailSender = new JavaMailSenderImpl();

      mailSender.setHost(mailhog.getHost());
      mailSender.setPort(mailhog.getFirstMappedPort());
      mailSender.setProtocol("smtp");

      Properties properties = new Properties();
      properties.setProperty("mail.smtp.auth", "false");
      properties.setProperty("mail.smtp.starttls.enable", "false");

      mailSender.setJavaMailProperties(properties);

      return mailSender;
    }
  }

  private String userUrl = "/user";

  /**
   * Tests that a user should be able to sign up. After signing up another user should not be able
   * use the same username or email.
   */
  @Test
  void userSignup() {
    var headers = new HttpHeaders();
    var ent = new HttpEntity<>(
        new SignupRequest("Steve-Man", "steve@test.com", "$tev3s_sup3rH@rdPassword"), headers);
    var response = restTemplate.exchange(userUrl + "/signup", HttpMethod.POST, ent, String.class);
    assertEquals(HttpStatus.OK, response.getStatusCode());

    /** This should fail as the user should already exist. */
    response = restTemplate.exchange(userUrl + "/signup", HttpMethod.POST, ent, String.class);
    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
  }

  /**
   * Create a user, gets the registration token from the email. Uses the token to complete
   * registration.
   */
  @Test
  @Order(2)
  void completeSignupAndRegistration() {
    var headers = new HttpHeaders();
    var ent = new HttpEntity<>(
        new SignupRequest("beardedMan", "j-dog@gmail.com", "$tev3s_sup3rH@rdPassword"), headers);
    var response = restTemplate.exchange(userUrl + "/signup", HttpMethod.POST, ent, String.class);
    assertEquals(HttpStatus.OK, response.getStatusCode());
    try {
      var token = getTokenFromEmail(0, 1);
      var regResponse = restTemplate.getForEntity(userUrl + "/regitrationConfirm?token={token}",
          String.class, token);
      assertEquals(HttpStatus.SEE_OTHER, regResponse.getStatusCode());
    } catch (Exception e) {
      // fail the test should show message
      assertTrue(false, e.getMessage());
    }
  }

  @Test
  @Order(1)
  void resetPassword() {
    String token = "";
    var response = restTemplate.exchange(userUrl + "/resetPassword?email={email}", HttpMethod.POST,
        new HttpEntity<>(new HttpHeaders()), String.class, "jsmith@google.com");
    assertEquals(HttpStatus.OK, response.getStatusCode());
    try {
      token = getTokenFromEmail(0, 2);
    } catch (Exception e) {
      // fail the test should show message
      assertTrue(false, e.getMessage());
    }
    response = restTemplate.exchange(userUrl + "/changePassword?token={tkn}", HttpMethod.GET,
        new HttpEntity<>(new HttpHeaders()), String.class, token);
    assertEquals(HttpStatus.SEE_OTHER, response.getStatusCode());

    var loc = Optional.ofNullable(response.getHeaders().get("Location")).orElseThrow().get(0);
    var urlStruct = loc.split("/");
    // token is the last part of the string
    var tknParam = urlStruct[urlStruct.length - 1];
    assertNotNull(tknParam);
    restTemplate.exchange(userUrl + "/changePassword?tokenPassword={tkn}", HttpMethod.POST,
        new HttpEntity<>(new TokenPassword(tknParam, "jsmithsNewsPassword!"), new HttpHeaders()),
        String.class, token);
    HttpHeaders headers = new HttpHeaders();
    headers.setBasicAuth("jsmith", "jsmithsNewsPassword!");
    HttpEntity<String> entity = new HttpEntity<>(headers);
    var signResp = restTemplate.postForEntity("/user/signin", entity, TokenRefreshResponse.class);
    assertEquals(HttpStatus.OK, signResp.getStatusCode());

  }

  String getTokenFromEmail(int emailIdx, int lineWithToken) throws Exception {
    String host = mailhog.getHost();
    int port = mailhog.getMappedPort(8025);

    String url = "http://" + host + ":" + port + "/api/v2/messages";
    var messageRaw = restTemplate.getForEntity(url, String.class).getBody();

    ObjectMapper mapper = new ObjectMapper();
    MailHogMessage mailHogMessage = mapper.readValue(messageRaw, MailHogMessage.class);
    var message = mailHogMessage.items()[emailIdx];
    var body = message.Content().Body();
    var secondLine = body.split("\n")[lineWithToken];
    var token = secondLine.split("=")[1];
    return token.strip();
  }

  @Test
  void refreshToken() {
    HttpHeaders headers = new HttpHeaders();
    // test user
    headers.setBasicAuth("jsmith", "test");
    HttpEntity<String> entity = new HttpEntity<>(headers);
    var signResp = restTemplate.postForEntity("/user/signin", entity, TokenRefreshResponse.class);
    var tknRefresh = Optional.ofNullable(signResp.getBody()).orElseThrow();
    var refreshTkn = tknRefresh.refreshToken();
    var resp = restTemplate.exchange(userUrl + "/refreshToken?token={refreshToken}",
        HttpMethod.POST, new HttpEntity<>(new HttpHeaders()), String.class, refreshTkn);
    assertEquals(HttpStatus.OK, resp.getStatusCode());
  }

  @Test
  void testUploadProfilePicture_Success() throws Exception {
    mockMvc = MockMvcBuilders.standaloneSetup(new UserController()).build();

    MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "dummy content".getBytes());
    int userId = 1;

    when(userManagementService.getUserById(userId)).thenReturn(Optional.of(new User(userId, "test@example.com", "testUser")));

    mockMvc.perform(multipart("/users/profile-picture")
                    .file(file)
                    .param("userId", String.valueOf(userId)))
            .andExpect(status().isOk()) // Expected state: 200 OK
            .andExpect(content().string("File uploaded successfully."));

    verify(userManagementService, times(1)).changeUserPhoto(any(User.class), anyString());
  }

  @Test
  void testRemoveUserPhoto_Success() {
    mockMvc = MockMvcBuilders.standaloneSetup(new UserController()).build();

    User user = new User(1, "test@example.com", "testUser");
    user.setUserPhoto("uploads/profile-pictures/test.jpg");

    when(userManagementService.getUserById(user.getUserId())).thenReturn(Optional.of(user));

    userManagementService.removeUserPhoto(user);

    verify(userManagementService, times(1)).saveUser(userCaptor.capture());
    assertNull(userCaptor.getValue().getUserPhoto());
  }


}
