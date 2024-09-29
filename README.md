
# safe-storage

`safe-storage` is an easy-to-use, encrypted web storage utility for JavaScript. It supports both `localStorage` and `sessionStorage`, ensuring your data is securely stored by encrypting keys and values. The package utilizes AES-GCM encryption and IndexedDB to keep sensitive data safe and manageable across web sessions.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Introduction

`safe-storage` simplifies the process of storing encrypted data in either `localStorage` or `sessionStorage`. It uses IndexedDB to securely store encryption keys and ensures that all data stored is both encrypted and decrypted seamlessly in the background. This package is perfect for applications requiring sensitive data storage, adding an extra layer of security without the need for complex encryption management.

## Installation

You can install the package via npm:

```bash
npm install safe-storage
```

## Usage

Here's an example of how to use `safe-storage`:

```javascript
import { SafeStorage } from 'safe-storage';

(async () => {
  const mechanism = 'localStorage';  // Or 'sessionStorage'
  const safeStorage = SafeStorage.init(mechanism);

  // Storing encrypted data
  await safeStorage.setItem('username', 'john_doe');

  // Retrieving decrypted data
  const username = await safeStorage.getItem('username');
  console.log(username);  // Outputs: john_doe

  // Removing data
  await safeStorage.removeItem('username');

  // Clearing all storage
  safeStorage.clear();
})();
```

## API

### `init(type: string)`

Initializes the `SafeStorage` class with the given storage type. The type can be either `localStorage` or `sessionStorage`.

### `setItem(key: string, value: any): Promise<void>`

Encrypts and stores the specified value under the provided key.

### `getItem(key: string): Promise<any>`

Retrieves and decrypts the value associated with the specified key.

### `removeItem(key: string): Promise<void>`

Removes the value associated with the specified key from storage.

### `clear()`

Clears all data from the selected storage mechanism.

## Development

To contribute to `safe-storage`, clone the repository and start adding new features or fixing issues.

### Scripts

- **Install dependencies:**
  ```bash
  npm install
  ```

- **Run the project in development mode:**
  ```bash
  npm run dev
  ```

## Testing

Run the test cases using:

```bash
npm test
```

## Contributing

Contributions are welcome! If you have suggestions, bug reports, or improvements, feel free to open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.
