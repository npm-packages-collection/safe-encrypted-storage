import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { SafeStorage } from '../index.js';
import 'fake-indexeddb/auto'; // Automatically mock indexedDB

describe('SafeStorage', () => {
  let safeStorage, window;

  // Setup the JSDOM environment before each test
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    window = dom.window;
    global.window = window; // Simulate the browser's window object
    global.localStorage = {
      setItem: sinon.spy(),
      getItem: sinon.spy(),
      removeItem: sinon.spy(),
      clear: sinon.spy()
    };
    global.sessionStorage = {
      setItem: sinon.spy(),
      getItem: sinon.spy(),
      removeItem: sinon.spy(),
      clear: sinon.spy()
    };
  });

  // Restore sinon spies after each test
  afterEach(() => {
    sinon.restore();
  });

  // Test case 1: Verifies if localStorage is used by default
  it('should use localStorage as the default storage type', async () => {
    safeStorage = SafeStorage.init();

    // Set an item and check if it's stored in localStorage
    await safeStorage.setItem('testKey', 'testValue');
    expect(localStorage.setItem.calledOnce).to.be.true;  // Check if setItem was called on localStorage
  });

  // Test case 2: Verifies if sessionStorage is used when specified
  it('should use sessionStorage when specified', async () => {
    safeStorage = SafeStorage.init('sessionStorage');

    // Set an item and check if it's stored in sessionStorage
    await safeStorage.setItem('testKey', 'testValue');
    expect(sessionStorage.setItem.calledOnce).to.be.true;  // Check if setItem was called on sessionStorage
  });


});
