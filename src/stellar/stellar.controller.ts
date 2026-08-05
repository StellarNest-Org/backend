import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StellarService } from './stellar.service';
import { BuildInvocationDto, SubmitTransactionDto } from './dto/build-invocation.dto';
import { xdr } from '@stellar/stellar-sdk';

@Controller('stellar')
@UseGuards(JwtAuthGuard)
export class StellarController {
  constructor(private readonly stellar: StellarService) {}

  /**
   * Builds unsigned XDR for a treasury contract call. The client signs this
   * with Freighter/hardware wallet/passkey and posts it back to `/submit`.
   * The backend never sees a secret key at any point in this flow.
   */
  @Post('build')
  async build(@Body() dto: BuildInvocationDto) {
    const args = this.resolveArgs(dto.method, dto.sourcePublicKey, dto.args);
    const unsignedXdr = await this.stellar.buildContractInvocation(
      dto.sourcePublicKey,
      dto.method,
      args,
    );
    return { xdr: unsignedXdr };
  }

  @Post('submit')
  async submit(@Body() dto: SubmitTransactionDto) {
    const result = await this.stellar.submitSignedTransaction(dto.signedXdr);
    return { hash: result.hash, status: result.status };
  }

  private resolveArgs(method: string, source: string, args: string[]): xdr.ScVal[] {
    switch (method) {
      case 'create_treasury':
        return this.stellar.createTreasuryArgs(source, args[0], args[1], args[2], Number(args[3]));
      case 'deposit':
        return this.stellar.depositArgs(args[0], source, args[1]);
      case 'request_withdrawal':
        return this.stellar.requestWithdrawalArgs(args[0], source, args[1], args[2]);
      case 'approve_withdrawal':
        return this.stellar.approveWithdrawalArgs(args[0], source);
      case 'contribute_to_goal':
        return this.stellar.contributeToGoalArgs(args[0], source, args[1]);
      case 'heartbeat':
        return this.stellar.heartbeatArgs(args[0], source);
      case 'claim_inheritance':
        return this.stellar.claimInheritanceArgs(args[0], source);
      default:
        throw new BadRequestException(`Unsupported method: ${method}`);
    }
  }
}
