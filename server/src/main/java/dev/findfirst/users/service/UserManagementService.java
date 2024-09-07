package dev.findfirst.users.service;

import java.nio.charset.StandardCharsets;
import java.rmi.UnexpectedException;
import java.time.Instant;
import java.util.Base64;
import java.util.NoSuchElementException;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import dev.findfirst.security.jwt.service.RefreshTokenService;
import dev.findfirst.security.userAuth.models.RefreshToken;
import dev.findfirst.security.userAuth.models.payload.request.SignupRequest;
import dev.findfirst.security.userAuth.tenant.data.TenantService;
import dev.findfirst.security.userAuth.utils.Constants;
import dev.findfirst.users.exceptions.EmailAlreadyRegisteredException;
import dev.findfirst.users.exceptions.NoUserFoundException;
import dev.findfirst.users.exceptions.UserNameTakenException;
import dev.findfirst.users.model.user.SigninTokens;
import dev.findfirst.users.model.user.Token;
import dev.findfirst.users.model.user.URole;
import dev.findfirst.users.model.user.User;
import dev.findfirst.users.repository.PasswordTokenRepository;
import dev.findfirst.users.repository.RoleRepository;
import dev.findfirst.users.repository.UserRepo;
import dev.findfirst.users.repository.VerificationTokenRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

  private final UserRepo userRepo;
  private final VerificationTokenRepository tokenRepository;
  private final PasswordTokenRepository passwordTokenRepository;
  private final RefreshTokenService refreshTokenService;
  private final PasswordEncoder passwdEncoder;
  private final RoleRepository roleRepository;
  private final TenantService tenantService;
  private final JwtEncoder encoder;

  @Value("${findfirst.app.jwtExpirationMs}") private int jwtExpirationMs;

  public User getUserByEmail(String email) throws NoUserFoundException {
    return userRepo.findByEmail(email).orElseThrow(NoUserFoundException::new);
  }

  public User getUserByUsername(String username) throws NoUserFoundException {
    return userRepo.findByUsername(username).orElseThrow(NoUserFoundException::new);
  }

  public boolean getUserExistByUsername(String username) {
    return userRepo.existsByUsername(username);
  }

  public boolean getUserExistEmail(String email) {
    return userRepo.existsByEmail(email);
  }

  public User saveUser(User user) {
    return userRepo.save(user);
  }

  public void deleteUser(User user) {
    userRepo.delete(user);
  }

  public void changeUserPassword(User user, String password) {
    user.setPassword(password);
    saveUser(user);
  }

  public String createVerificationToken(User user) {
    String token = UUID.randomUUID().toString();
    Token verificationToken = new Token(user, token);
    tokenRepository.save(verificationToken);
    return token;
  }

  public Token getVerificationToken(String VerificationToken) {
    return tokenRepository.findByToken(VerificationToken);
  }

  public String createResetPwdToken(User user) {
    String token = UUID.randomUUID().toString();
    Token pwdToken = new Token(user, token);
    log.debug("creating token for: {}", user);
    var old = passwordTokenRepository.findByUser(user);
    if (old != null) {
      passwordTokenRepository.delete(old);
    }
    passwordTokenRepository.save(pwdToken);
    log.debug("saving token");
    return token;
  }

  public Token getPasswordToken(String pwdToken) {
    return passwordTokenRepository.findByToken(pwdToken);
  }

  public User getUserFromPasswordToken(String pwdToken) {
    return passwordTokenRepository.findByToken(pwdToken).getUser();
  }

  public User createNewUserAccount(SignupRequest signupRequest)
      throws UserNameTakenException, EmailAlreadyRegisteredException, UnexpectedException {
    if (getUserExistByUsername(signupRequest.username())) {
      throw new UserNameTakenException();
    }

    if (getUserExistEmail(signupRequest.email())) {
      throw new EmailAlreadyRegisteredException();
    }

    // Create new user's account
    User user = new User(signupRequest, passwdEncoder.encode(signupRequest.password()));
    var role =
        roleRepository.findById(URole.ROLE_USER.ordinal()).orElseThrow(NoSuchElementException::new);
    user.setRole(role);
    var t = tenantService.create(signupRequest.username());

    // create a new tenant
    try {
      user.setTenantId(t.getId());
      return saveUser(user);
    } catch (Exception e) {
      // If any exception occurs we should delete the records that were just made.
      tenantService.deleteById(t.getId());
      deleteUser(user);
      throw new UnexpectedException("Unexpected error occured during signup, try again");
    }
  }

  public String generateTokenFromUser(User user) {
    Instant now = Instant.now();
    String email = user.getEmail();
    Integer roleId = user.getRole().getRole_id();
    String roleName = user.getRole().getName().name();
    Integer tenantId = user.getTenantId();
    JwtClaimsSet claims = JwtClaimsSet.builder().issuer("self").issuedAt(Instant.now())
        .expiresAt(now.plusSeconds(jwtExpirationMs)).subject(email).claim("scope", email)
        .claim(Constants.ROLE_ID_CLAIM, roleId).claim(Constants.ROLE_NAME_CLAIM, roleName)
        .claim(Constants.TENANT_ID_CLAIM, tenantId).build();
    return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
  }

  public SigninTokens signinUser(String authorization) throws NoUserFoundException {
    String base64Credentials = authorization.substring("Basic".length()).trim();
    byte[] credDecoded = Base64.getDecoder().decode(base64Credentials);
    String credentials = new String(credDecoded, StandardCharsets.UTF_8);
    // credentials = username:password
    final String[] values = credentials.split(":", 2);

    // This error should never occur, as authentication checks username and throws.
    User user;
    user = getUserByUsername(values[0]);
    final RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
    String jwt = generateTokenFromUser(user);

    return new SigninTokens(jwt, refreshToken.getToken());
  }
}
