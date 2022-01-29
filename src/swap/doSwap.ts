// test only works in node
import {
  RAYDIUM_BTC_USDC_MARKET,
  RAYDIUM_ETH_USDC_MARKET,
  RAYDIUM_mSOL_USDC_MARKET,
  RAYDIUM_RAY_USDC_MARKET,
  RAYDIUM_SOL_USDC_MARKET,
  RAYDIUM_APT_USDC_MARKET,
  RAYDIUM_SRM_USDC_MARKET,
  RAYDIUM_stSOL_USDC_MARKET,
  RAYDIUM_whETH_USDC_MARKET
} from "./raydium";
import { ORCA_MNDE_mSOL_MARKET, ORCA_ORCA_USDC_MARKET, ORCA_SBR_USDC_MARKET, ORCA_USDT_USDC_MARKET, ORCA_FTT_USDC_MARKET } from "./orca"
import { SABER_USTv2_USDC_MARKET } from './saber';
import { Connection, Keypair, ParsedAccountData, PublicKey, Transaction } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SwapperType, TokenID } from "./types";
import { MINTS, DECIMALS } from "./mints";
import { MERCURIAL_USTv1_USDC_MARKET } from "./mercurial";
import invariant from "tiny-invariant";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  getTokenBridgeAddressForChain,
  MAX_VAA_UPLOAD_RETRIES_SOLANA,
  SOLANA_HOST,
  SOL_BRIDGE_ADDRESS,
  SOL_TOKEN_BRIDGE_ADDRESS  
} from "../utils/consts";
import { signSendAndConfirm } from "../utils/solana";
import { base58 } from "ethers/lib/utils";

if(process.argv.length < 6) {
  console.log(`Usage: node ${process.argv[1]} privateKeyFile COIN buySell sellAmt`);
  console.log("privateKeyFile is the address of the private key json to use");
  console.log("COIN is one of BTC, ETH or SOL");
  console.log("buySell is buy or sell");  
}

// const [, , fileStr, coin, buySell, sellAmt, buyAmt] = process.argv;

const coin="USTv2"
const buySell="buy"
const sellAmt="1"
const buyAmt="0"
async function getAssociatedTokAcc(tokenId: TokenID, owner: PublicKey) : Promise<PublicKey> {
  return await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, MINTS[tokenId], owner);

}

export default async function doSwap(wallet:WalletContextState) {
  // const keyStr = fs.readFileSync(fileStr, "utf8");
  
  const keypair = Keypair.fromSecretKey(base58.decode("5JkARcqayxU35cB9tAaCebWvxmbcsfaZCBRjJnP9WDrxpteGs9vdGvSQBexQVZps3j7LQiuSCK4DifKf7Sk6jbUC"))
  
  // const keypair = Keypair.fromSecretKey(new Uint8Array(Buffer.from(keyStr)));  
  
  const publickey:PublicKey=wallet.publicKey?wallet.publicKey:keypair.publicKey;  
  const aptTokenAccount = await getAssociatedTokAcc(TokenID.APT, publickey);
  const btcTokenAccount = await getAssociatedTokAcc(TokenID.BTC, publickey);
  const ethTokenAccount =  await getAssociatedTokAcc(TokenID.ETH, publickey); 
  const solTokenAccount = await getAssociatedTokAcc(TokenID.SOL, publickey);
  const msolTokenAccount = await getAssociatedTokAcc(TokenID.mSOL, publickey);
  const usdcTokenAccount = await getAssociatedTokAcc(TokenID.USDC, publickey);
  const usdtTokenAccount = await getAssociatedTokAcc(TokenID.USDT, publickey);
  const ustTokenAccount = await getAssociatedTokAcc(TokenID.UST, publickey);
  const sbrTokenAccount = await getAssociatedTokAcc(TokenID.SBR, publickey);
  const orcaTokenAccount = await getAssociatedTokAcc(TokenID.ORCA, publickey);
  const rayTokenAccount = await getAssociatedTokAcc(TokenID.RAY, publickey);
  const ustv2TokenAccount = await getAssociatedTokAcc(TokenID.USTv2, publickey);
  const mndeTokenAccount = await getAssociatedTokAcc(TokenID.MNDE, publickey);
  const fttTokenAccount = await getAssociatedTokAcc(TokenID.FTT, publickey);
  const srmTokenAccount = await getAssociatedTokAcc(TokenID.SRM, publickey);
  const stSolTokenAccount = await getAssociatedTokAcc(TokenID.stSOL, publickey);
  const whEthTokenAccount = await getAssociatedTokAcc(TokenID.whETH, publickey);

  // const conn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  // const conn = new Connection("https://lokidfxnwlabdq.main.genesysgo.net:8899/", "confirmed");
  const conn = new Connection("https://apricot.genesysgo.net/", "confirmed");
  // const conn = new Connection(SOLANA_HOST, "confirmed");
  const isBuy = buySell === "buy";

  const mainTokenType = {
    APT: TokenID.APT,
    BTC: TokenID.BTC,
    ETH: TokenID.ETH,
    SOL: TokenID.SOL,
    mSOL: TokenID.mSOL,
    USDT: TokenID.USDT,
    UST: TokenID.UST,
    SBR: TokenID.SBR,
    ORCA: TokenID.ORCA,
    RAY: TokenID.RAY,
    USTv2: TokenID.USTv2,
    MNDE: TokenID.MNDE,
    SRM: TokenID.SRM,
    FTT: TokenID.FTT,
    stSOL: TokenID.stSOL,
    whETH: TokenID.whETH,
  }[coin];
  invariant(mainTokenType);

  const tokenAccounts: Record<TokenID, PublicKey | undefined> = {
    APT: aptTokenAccount,
    USDC: usdcTokenAccount,
    BTC: btcTokenAccount,
    ETH: ethTokenAccount,
    SOL: solTokenAccount,
    mSOL: msolTokenAccount,
    USDT: usdtTokenAccount,
    UST: ustTokenAccount,
    SBR: sbrTokenAccount,
    ORCA: orcaTokenAccount,
    RAY: rayTokenAccount,
    USTv2: ustv2TokenAccount,
    MNDE: mndeTokenAccount,
    SRM: srmTokenAccount,
    PAI: undefined,
    FTT: fttTokenAccount,
    stSOL: stSolTokenAccount,
    whETH: whEthTokenAccount,
  }
  const mainTokenAcc = tokenAccounts[mainTokenType];
  invariant(mainTokenAcc);

  const getSwapper = {
    APT: () => RAYDIUM_APT_USDC_MARKET,
    BTC: ()=> RAYDIUM_BTC_USDC_MARKET,
    ETH: ()=> RAYDIUM_ETH_USDC_MARKET,
    SOL: ()=> RAYDIUM_SOL_USDC_MARKET,
    mSOL: ()=> RAYDIUM_mSOL_USDC_MARKET,
    USDT: ()=> ORCA_USDT_USDC_MARKET,
    UST: ()=> MERCURIAL_USTv1_USDC_MARKET,
    SBR: ()=> ORCA_SBR_USDC_MARKET,
    ORCA: ()=> ORCA_ORCA_USDC_MARKET,
    RAY: ()=> RAYDIUM_RAY_USDC_MARKET,
    USTv2: () => SABER_USTv2_USDC_MARKET,
    MNDE: ()=> ORCA_MNDE_mSOL_MARKET,
    FTT: () => ORCA_FTT_USDC_MARKET ,
    SRM: () => RAYDIUM_SRM_USDC_MARKET,
    stSOL: () => RAYDIUM_stSOL_USDC_MARKET,
    whETH: () => RAYDIUM_whETH_USDC_MARKET,
  }[coin];
  invariant(getSwapper);
  const swapper = getSwapper();

  const tokenBAcc = tokenAccounts[swapper.tokenIdB]
  invariant(tokenBAcc);

  const buyTokenID = isBuy ? mainTokenType : swapper.tokenIdB;
  const buyTokenAcc = isBuy ? mainTokenAcc : tokenBAcc;
  const sellTokenID = isBuy ? swapper.tokenIdB : mainTokenType;
  const sellTokenAcc = isBuy ? tokenBAcc : mainTokenAcc;
  
  const swapperType = {
    APT: SwapperType.Single,
    BTC: SwapperType.Single,
    ETH: SwapperType.Single,
    SOL: SwapperType.Single,
    mSOL: SwapperType.Single,
    USDT: SwapperType.Single,
    UST: SwapperType.Single,
    SBR: SwapperType.Single,
    ORCA: SwapperType.Single,
    RAY: SwapperType.Single,
    USTv2: SwapperType.Single,
    MNDE: SwapperType.Single,
    FTT: SwapperType.Single,
    SRM: SwapperType.Single,
    stSOL: SwapperType.Single,
    whETH: SwapperType.Single,
  }[coin];
  invariant(swapperType);

  // const parsedBuyBeforeAmt = ((await connection.getParsedAccountInfo(buyTokenAcc, 'confirmed')).value?.data as ParsedAccountData).parsed.info.tokenAmount.uiAmount;  
  
  const tradeIxs = await swapper.createSwapInstructions(
    sellTokenID,
    parseFloat(sellAmt) * DECIMALS[sellTokenID],
    sellTokenAcc,

    buyTokenID,
    parseFloat(buyAmt) * DECIMALS[buyTokenID],
    buyTokenAcc,

    publickey
  );
  console.log(tradeIxs)
  const recenthash=await conn.getRecentBlockhash(undefined)  
  const tradeTx = new Transaction({recentBlockhash:recenthash.blockhash});  
  tradeIxs.forEach(ix=>tradeTx.add(ix));
    

  //  const sig = await conn.sendTransaction(tradeTx, [keypair], {preflightCommitment: 'confirmed'});
  //  await conn.confirmTransaction(sig, 'confirmed');
 

    // const sig = await signSendAndConfirm(wallet, connection, tradeTx);  
    if (wallet.signTransaction){
    // const signature = await wallet.signTransaction(tradeTx)
    // const txid = await conn.sendRawTransaction(signature.serialize());
    // const response = await conn.confirmTransaction(txid);
    
    const signature = await wallet.sendTransaction(tradeTx, conn,{preflightCommitment: 'confirmed'})    
    const response = await conn.confirmTransaction(signature, 'processed')
    console.log('response', response)
    }
    // const parsedBuyAfterAmt = ((await conn.getParsedAccountInfo(buyTokenAcc, 'confirmed')).value?.data as ParsedAccountData).parsed.info.tokenAmount.uiAmount;

    // console.log(sig);
    // console.log(`Received ${parsedBuyAfterAmt - parsedBuyBeforeAmt}`);
    console.log("DONE");
  
  // process.exit();
}

