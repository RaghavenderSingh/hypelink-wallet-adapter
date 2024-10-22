import { BaseMessageSignerWalletAdapter, WalletName, WalletReadyState } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, CustomChainConfig, IAdapter, IProvider } from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

// Define the type for the wallet name
export type HyperLinkName = WalletName<'HyperLink'>;
interface SolanaProvider extends IProvider {
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signMessage(message: Uint8Array): Promise<Uint8Array>;
}

// Define the constant wallet name
export const HYPERLINK_NAME: HyperLinkName = 'HyperLink' as WalletName<'HyperLink'>;

export class HyperLinkWalletAdapter extends BaseMessageSignerWalletAdapter {
    name: HyperLinkName = HYPERLINK_NAME;
    url = '';
    icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMyAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYuNSIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzAzNjRGRiIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTExLjIxODYgOS40OTIxOUMxMC40NTM5IDkuNDkyMTkgOS44MzM5OCAxMC4xMTIxIDkuODMzOTggMTAuODc2OFYxMi40ODk4QzkuODMzOTggMTMuMjU0NSAxMC40NTM5IDEzLjg3NDQgMTEuMjE4NiAxMy44NzQ0SDEzLjY2ODRWMjIuODk3NkMxMy42Njg0IDIzLjY2MjMgMTQuMjg4MyAyNC4yODIyIDE1LjA1MyAyNC4yODIySDE2LjY2NkMxNy40MzA3IDI0LjI4MjIgMTguMDUwNiAyMy42NjIzIDE4LjA1MDYgMjIuODk3NlYxMi41MDE1QzE4LjA1MDYgMTIuNDk3NiAxOC4wNTA2IDEyLjQ5MzcgMTguMDUwNiAxMi40ODk4VjEwLjg3NjhDMTguMDUwNiAxMC4xMTIxIDE3LjQzMDcgOS40OTIxOSAxNi42NjYgOS40OTIxOUgxNS4wNTNIMTEuMjE4NloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yMS4zMzc2IDEzLjg3NDRDMjIuNTQ3NyAxMy44NzQ0IDIzLjUyODcgMTIuODkzNCAyMy41Mjg3IDExLjY4MzNDMjMuNTI4NyAxMC40NzMyIDIyLjU0NzcgOS40OTIxOSAyMS4zMzc2IDkuNDkyMTlDMjAuMTI3NSA5LjQ5MjE5IDE5LjE0NjUgMTAuNDczMiAxOS4xNDY1IDExLjY4MzNDMTkuMTQ2NSAxMi44OTM0IDIwLjEyNzUgMTMuODc0NCAyMS4zMzc2IDEzLjg3NDRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
    readonly supportedTransactionVersions = null;

    private _connecting: boolean;
    private _wallet: Web3Auth | null;
    private _publicKey: PublicKey | null;
    private _provider: SolanaProvider | null;

    constructor() {
        super();
        this._connecting = false;
        this._wallet = null;
        this._publicKey = null;
        this._provider = null;
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return !!this._wallet?.connected;
    }

    get readyState(): WalletReadyState {
        return WalletReadyState.Installed;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            this._connecting = true;

            if (!this._wallet) {
                const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
                if (!clientId) throw new Error('Web3Auth Client ID is required');

                const chainConfig: CustomChainConfig = {
                    chainNamespace: CHAIN_NAMESPACES.SOLANA,
                    chainId: "0x3",
                    rpcTarget: "https://api.devnet.solana.com",
                    displayName: "Solana Devnet",
                    blockExplorer: "https://explorer.solana.com",
                    ticker: "SOL",
                    tickerName: "Solana",
                };

                this._wallet = new Web3Auth({
                    clientId,
                    chainConfig,
                    web3AuthNetwork: "mainnet",
                    uiConfig: {
                        loginMethodsOrder: ["google"]
                    }
                });

                const privateKeyProvider = new SolanaPrivateKeyProvider({
                    config: { chainConfig }
                });

                const openloginAdapter = this.createOpenLoginAdapter(privateKeyProvider);
                this._wallet.configureAdapter(openloginAdapter as IAdapter<unknown>);

                await this._wallet.initModal();
            }

            const web3authProvider = await this._wallet.connect();
            if (!web3authProvider) throw new Error('Failed to connect to Web3Auth');
            
            // Cast the provider to our custom SolanaProvider type
            this._provider = web3authProvider as SolanaProvider;

            const response = await this._provider.request({
                method: "getAccounts"
            });

            const accounts = response as string[];
            
            if (accounts && accounts.length > 0) {
                this._publicKey = new PublicKey(accounts[0]);
                this.emit('connect', this._publicKey);
            } else {
                throw new Error('No account found');
            }

        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    private createOpenLoginAdapter(privateKeyProvider: any) {
        return new OpenloginAdapter({
            privateKeyProvider,
            adapterSettings: {
                network: "mainnet", // or "testnet"
                uxMode: "popup",
                
            }
        });
    }

    async disconnect(): Promise<void> {
        if (this._wallet) {
            await this._wallet.logout();
            this._wallet = null;
            this._publicKey = null;
            this._provider = null;
        }
        this.emit('disconnect');
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        try {
            if (!this._provider) throw new Error('Wallet not connected');
            if (!this._publicKey) throw new Error('Public key not available');

            const signedTransaction = await this._provider.signTransaction(transaction);
            return signedTransaction;
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        try {
            if (!this._provider) throw new Error('Wallet not connected');
            if (!this._publicKey) throw new Error('Public key not available');

            const signedTransactions = await Promise.all(
                transactions.map((transaction) => this._provider!.signTransaction(transaction))
            );
            return signedTransactions;
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            if (!this._provider) throw new Error('Wallet not connected');
            if (!this._publicKey) throw new Error('Public key not available');

            const signedMessage = await this._provider.signMessage(message);
            return signedMessage;
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }
}