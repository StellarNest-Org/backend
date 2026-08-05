import { IsIn, IsString } from 'class-validator';

export const SUPPORTED_METHODS = [
  'create_treasury',
  'deposit',
  'request_withdrawal',
  'approve_withdrawal',
  'contribute_to_goal',
  'heartbeat',
  'claim_inheritance',
] as const;

export class BuildInvocationDto {
  @IsString()
  sourcePublicKey: string;

  @IsIn(SUPPORTED_METHODS)
  method: (typeof SUPPORTED_METHODS)[number];

  @IsString({ each: true })
  args: string[];
}

export class SubmitTransactionDto {
  @IsString()
  signedXdr: string;
}
