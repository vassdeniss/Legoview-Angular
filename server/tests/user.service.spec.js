const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');
const jwt = require('../lib/jwt');
const User = require('../models/User');

const rewire = require('rewire');
const service = rewire('../services/userService');

describe('User service methods', function () {
  let generateTokenStubResetter;
  const generateTokenStub = sinon.stub().returns({
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  });

  // beforeEach(() => {
  //   generateTokenStubResetter = service.__set__(
  //     'generateToken',
  //     generateTokenStub
  //   );
  // });

  afterEach(() => {
    //generateTokenStubResetter();
    //generateTokenStub.resetHistory();
    sinon.restore();
  });

  describe('register', () => {
    it('should create a new user and return a token', async () => {
      const userData = {
        username: 'testuser',
        password: 'testpassword',
      };
      const user = new User(userData);
      const createStub = sinon.stub(User, 'create').resolves(user);
      // const generateTokenExportedStub = sinon.stub(service, 'generateToken').resolves({
      //   accessToken: 'access_token',
      //   refreshToken: 'refresh_token',
      // });
      const generateTokenStub = sinon.stub().returns({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      const generateTokenStubResetter = service.__set__(
        'generateToken',
        generateTokenStub
      );

      const result = await service.register(userData);

      expect(createStub.calledOnceWith(userData)).to.be.true;
      expect(generateTokenStub.calledOnceWith(user)).to.be.true;
      expect(result.accessToken).to.equal('access_token');
      expect(result.refreshToken).to.equal('refresh_token');

      generateTokenStubResetter();
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return a token', async () => {
      const userData = {
        email: 'testuser@mail.com',
        password: 'testpassword',
      };
      const user = new User(userData);
      const findOneStub = sinon.stub(User, 'findOne').resolves(user);
      const compareStub = sinon.stub(bcrypt, 'compare').resolves(true);
      const generateTokenStub = sinon.stub().returns({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      const generateTokenStubResetter = service.__set__(
        'generateToken',
        generateTokenStub
      );

      const result = await service.login(userData);

      expect(findOneStub.calledOnceWith({ email: userData.email })).to.be.true;
      expect(compareStub.calledOnceWith(userData.password, user.password)).to.be
        .true;
      expect(generateTokenStub.calledOnceWith(user)).to.be.true;
      expect(result.accessToken).to.equal('access_token');
      expect(result.refreshToken).to.equal('refresh_token');

      generateTokenStubResetter();
    });

    it('should throw an error with non-existant email', async () => {
      const userData = {
        email: 'testEmail@email.com',
        password: 'testpassword',
      };

      sinon.stub(User, 'findOne').resolves(null);

      try {
        await service.login(userData);
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('Invalid email or password!');
      }
    });

    it('should throw an error with invalid password', async () => {
      const userData = {
        email: 'testEmail@email.com',
        password: 'testpassword',
      };

      sinon.stub(User, 'findOne').resolves(userData);
      sinon.stub(bcrypt, 'compare').resolves(false);

      try {
        await service.login(userData);
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('Invalid email or password!');
      }
    });
  });

  describe('logout', () => {
    it('should clear the refreshToken field and save the user', async () => {
      const user = {
        refreshToken: 'oldRefreshToken',
        save: sinon.stub().resolves({ refreshToken: '' }),
      };
      const findOneStub = sinon.stub(User, 'findOne').resolves(user);

      const result = await service.logout('oldRefreshToken');

      expect(findOneStub.calledOnceWith({ refreshToken: 'oldRefreshToken' })).to
        .be.true;
      expect(user.refreshToken).to.equal('');
      expect(user.save.calledOnce).to.be.true;
      expect(result).to.deep.equal({ refreshToken: '' });
    });
  });

  describe('generateToken', () => {
    it('should return a token for the user', async () => {
      const userData = {
        username: 'testusername',
        email: 'testEmail@email.com',
        password: 'testpassword',
        repeatPassword: 'testpassword',
      };
      const user = new User(userData);
      const signStub = sinon
        .stub(jwt, 'sign')
        .onFirstCall()
        .resolves('access_token')
        .onSecondCall()
        .resolves('refresh_token');
      const saveStub = sinon.stub(user, 'save').resolves(true);

      const result = await service.generateToken(user);

      expect(signStub.calledTwice).to.be.true;
      expect(saveStub.calledOnce).to.be.true;
      expect(result.accessToken).to.equal('access_token');
      expect(result.refreshToken).to.equal('refresh_token');
      expect(user.refreshToken).to.exist;
      expect(user.refreshToken).to.equal('refresh_token');
    });
  });

  describe('validateRefreshToken', () => {
    it('should return the user if the refresh token is valid', async () => {
      const mockUser = {
        name: 'John Doe',
        refreshToken: 'valid-refresh-token',
      };
      const findOneStub = sinon.stub(User, 'findOne').resolves(mockUser);

      const result = await service.validateRefreshToken('valid-refresh-token');

      expect(
        findOneStub.calledOnceWith({ refreshToken: 'valid-refresh-token' })
      ).to.be.true;
      expect(result).to.equal(mockUser);
    });

    it('should throw an error if the refresh token is invalid', async () => {
      sinon.stub(User, 'findOne').resolves(null);
      const refreshToken = 'invalid-refresh-token';

      try {
        await service.validateRefreshToken(refreshToken);
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.equal('Invalid refresh token!');
      }
    });
  });
});
