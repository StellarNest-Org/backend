import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

/**
 * Builds unsigned Soroban transaction XDR against the StellarNest `treasury`
 * contract and submits already-signed XDR. This service never receives or
 * stores a user's secret key — every state-changing call is signed
 * client-side (Freighter / hardware wallet / passkey signer) and the signed
 * envelope is handed back to `submitSignedTransaction`.
 */
@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: rpc.Server;
  private readonly networkPassphrase: string;
  private readonly treasuryContractId: string;

  constructor(private readonly config: ConfigService) {
    this.server = new rpc.Server(
      this.config.get<string>('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org'),
    );
    this.networkPassphrase = this.config.get<string>(
      'STELLAR_NETWORK_PASSPHRASE',
      'Test SDF Network ; September 2015',
    );
    this.treasuryContractId = this.config.get<string>('TREASURY_CONTRACT_ID', '');
  }

  /** Builds an unsigned, simulated + prepared XDR envelope for a contract call. */
  async buildContractInvocation(
    sourcePublicKey: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<string> {
    const account = await this.server.getAccount(sourcePublicKey);
    const contract = new Contract(this.treasuryContractId);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(300)
      .build();

    const prepared = await this.server.prepareTransaction(transaction);
    return prepared.toXDR();
  }

  /** Submits a transaction that the client has already signed. */
  async submitSignedTransaction(signedXdr: string) {
    const transaction = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const result = await this.server.sendTransaction(transaction);

    if (result.status === 'ERROR') {
      this.logger.error(`Transaction submission failed: ${JSON.stringify(result.errorResult)}`);
    }
    return result;
  }

  async getTransactionStatus(hash: string) {
    return this.server.getTransaction(hash);
  }

  /** Read-only simulation, used to fetch on-chain view data without a signer. */
  async simulateRead<T>(method: string, args: xdr.ScVal[]): Promise<T> {
    const contract = new Contract(this.treasuryContractId);
    const dummyAccount = await this.server.getAccount(
      this.config.get<string>('STELLAR_READ_SOURCE_ACCOUNT', ''),
    );
    const transaction = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

