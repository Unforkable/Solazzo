export interface EmailCopy {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export function buildLaunchCopy(): EmailCopy {
  return {
    subject: "Solazzo is live",
    htmlBody: `<p>The studio is open.</p>
<p>You can now upload your photo, generate your portrait set, and lock SOL to claim a slot. Your Baroque portrait evolves as SOL moves toward $1,000.</p>
<p>1,000 slots. One position per slot. You keep your position until displaced.</p>
<p><a href="https://make.solazzo.fun">Enter the studio</a></p>
<p>Your capital is never spent. If you are displaced, your full principal becomes immediately claimable. At settlement, principal is claimable in full by design. The variable is position, not principal.</p>`,
    textBody: `The studio is open.\n\nYou can now upload your photo, generate your portrait set, and lock SOL to claim a slot. Your Baroque portrait evolves as SOL moves toward $1,000.\n\n1,000 slots. One position per slot. You keep your position until displaced.\n\nEnter the studio: https://make.solazzo.fun\n\nYour capital is never spent. If you are displaced, your full principal becomes immediately claimable. At settlement, principal is claimable in full by design. The variable is position, not principal.`,
  };
}

export function buildReplacedCopy(slotId: number): EmailCopy {
  return {
    subject: `Your Solazzo slot #${slotId} was displaced`,
    htmlBody: `<p>A higher commitment displaced your position on slot <strong>#${slotId}</strong>.</p>
<p>Your principal is now immediately claimable in your claimable balance. Your Solazzo Points earned while you held the position remain yours.</p>
<p>You can re-enter by claiming a new position.</p>
<p><a href="https://make.solazzo.fun/positions">View your positions</a> &middot; <a href="https://make.solazzo.fun/gallery">Browse the gallery</a></p>`,
    textBody: `A higher commitment displaced your position on slot #${slotId}.\n\nYour principal is now immediately claimable in your claimable balance. Your Solazzo Points earned while you held the position remain yours.\n\nYou can re-enter by claiming a new position.\n\nView your positions: https://make.solazzo.fun/positions\nBrowse the gallery: https://make.solazzo.fun/gallery`,
  };
}

export function buildClaimableCopy(solAmount: number): EmailCopy {
  return {
    subject: `${solAmount} SOL claimable on Solazzo`,
    htmlBody: `<p><strong>${solAmount} SOL</strong> is currently claimable on your account.</p>
<p>This can result from displacement or settlement. Funds remain claimable on-chain until withdrawn.</p>
<p><a href="https://make.solazzo.fun/positions">Claim your SOL</a></p>`,
    textBody: `${solAmount} SOL is currently claimable on your account.\n\nThis can result from displacement or settlement. Funds remain claimable on-chain until withdrawn.\n\nClaim your SOL: https://make.solazzo.fun/positions`,
  };
}
