import {
  ChainId,
  CHAIN_ID_SOLANA,  
  isEVMChain,
} from "@certusone/wormhole-sdk";
import EthereumSignerKey from "./EthereumSignerKey";
import SolanaWalletKey from "./SolanaWalletKey";

function KeyAndBalance({ chainId }: { chainId: ChainId }) {
  if (isEVMChain(chainId)) {
    return (
      <>
        <EthereumSignerKey />
      </>
    );
  }
  if (chainId === CHAIN_ID_SOLANA) {
    return (
      <>
        <SolanaWalletKey />
      </>
    );
  } 
  return null;
}

export default KeyAndBalance;
