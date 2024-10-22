# HyperLink Wallet Adapter

This repository contains the implementation of the `HyperLinkWalletAdapter`, a custom Solana wallet adapter built on top of `Web3Auth`. It allows users to connect to a Solana wallet using Google authentication via the `Web3Auth` modal.

## Features

- **Google-based Authentication:** Uses `Web3Auth` to allow users to sign in via Google to create a Solana wallet.
- **Solana Transaction Signing:** Supports signing Solana transactions, including versioned transactions.
- **Message Signing:** Enables signing messages with the user's Solana private key.
- **Disconnect & Logout:** Handles wallet disconnection and session management.

## Installation

To install the necessary dependencies, run the following command:

```bash
npm install @solana/wallet-adapter-base @web3auth/modal @web3auth/base @web3auth/openlogin-adapter @web3auth/solana-provider @solana/web3.js
```
