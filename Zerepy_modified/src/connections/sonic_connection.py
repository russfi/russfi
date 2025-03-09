import logging
import os
import requests
import time
import json
import uuid
import hashlib
import hmac
import base64
from typing import Dict, Any, Optional
from dotenv import load_dotenv, set_key
from web3 import Web3
from web3.middleware import geth_poa_middleware
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from eth_account._utils.legacy_transactions import serializable_unsigned_transaction_from_dict
import rlp
from eth_utils import to_bytes

# Add these new imports
try:
    from ecdsa import SigningKey, NIST256p
    import canonicaljson
except ImportError:
    raise ImportError(
        "Required packages not installed. Please run:n"
        "pip install ecdsa canonicaljson cryptography"
    )

from src.constants.abi import ERC20_ABI
from src.connections.base_connection import BaseConnection, Action, ActionParameter
from src.constants.networks import SONIC_NETWORKS

logger = logging.getLogger("connections.sonic_connection")


class SonicConnectionError(Exception):
    """Base exception for Sonic connection errors"""
    pass

class SonicConnection(BaseConnection):
    
    def __init__(self, config: Dict[str, Any]):
        logger.info("Initializing Sonic connection...")
        self._web3 = None
        
        # Get network configuration
        network = config.get("network", "mainnet")
        if network not in SONIC_NETWORKS:
            raise ValueError(f"Invalid network '{network}'. Must be one of: {', '.join(SONIC_NETWORKS.keys())}")
            
        network_config = SONIC_NETWORKS[network]
        self.explorer = network_config["scanner_url"]
        self.rpc_url = network_config["rpc_url"]
        
        super().__init__(config)
        self._initialize_web3()
        self.ERC20_ABI = ERC20_ABI
        self.NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        self.aggregator_api = "https://aggregator-api.kyberswap.com/sonic/api/v1"

    def _get_explorer_link(self, tx_hash: str) -> str:
        """Generate block explorer link for transaction"""
        return f"{self.explorer}/tx/{tx_hash}"

    def _initialize_web3(self):
        """Initialize Web3 connection"""
        if not self._web3:
            self._web3 = Web3(Web3.HTTPProvider(self.rpc_url))
            self._web3.middleware_onion.inject(geth_poa_middleware, layer=0)
            if not self._web3.is_connected():
                raise SonicConnectionError("Failed to connect to Sonic network")
            
            try:
                chain_id = self._web3.eth.chain_id
                logger.info(f"Connected to network with chain ID: {chain_id}")
            except Exception as e:
                logger.warning(f"Could not get chain ID: {e}")

    @property
    def is_llm_provider(self) -> bool:
        return False

    def validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Sonic configuration from JSON"""
        required = ["network"]
        missing = [field for field in required if field not in config]
        if missing:
            raise ValueError(f"Missing config fields: {', '.join(missing)}")
        
        if config["network"] not in SONIC_NETWORKS:
            raise ValueError(f"Invalid network '{config['network']}'. Must be one of: {', '.join(SONIC_NETWORKS.keys())}")
            
        return config

    def get_token_by_ticker(self, ticker: str) -> Optional[str]:
        """Get token address by ticker symbol"""
        try:
            if ticker.lower() in ["s", "S"]:
                return "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                
            response = requests.get(
                f"https://api.dexscreener.com/latest/dex/search?q={ticker}"
            )
            response.raise_for_status()

            data = response.json()
            if not data.get('pairs'):
                return None

            sonic_pairs = [
                pair for pair in data["pairs"] if pair.get("chainId") == "sonic"
            ]
            sonic_pairs.sort(key=lambda x: x.get("fdv", 0), reverse=True)

            sonic_pairs = [
                pair
                for pair in sonic_pairs
                if pair.get("baseToken", {}).get("symbol", "").lower() == ticker.lower()
            ]

            if sonic_pairs:
                return sonic_pairs[0].get("baseToken", {}).get("address")
            return None

        except Exception as error:
            logger.error(f"Error fetching token address: {str(error)}")
            return None

    # def get_token_by_ticker(self, ticker: str) -> Optional[str]:
    #     """Get token address by ticker symbol using Sonicscan API"""
    #     try:
    #         if ticker.lower() in ["s", "S"]:
    #             return "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            
    #         response = requests.get(
    #             f"https://api.sonicscan.org/api",
    #             params={
    #                 "module": "token",
    #                 "action": "search",
    #                 "q": ticker,
    #                 "apikey": "1TGWX56WPZ9JBC5VGFG4E71CNMDFB1TX6Q"
    #             }
    #         )
    #         response.raise_for_status()

    #         data = response.json()
    #         if data.get("status") != "1" or not data.get("result"):
    #             return None

    #         # Filter exact symbol match (case-insensitive)
    #         matches = [
    #             token for token in data["result"]
    #             if token.get("symbol", "").lower() == ticker.lower()
    #         ]

    #         # Sort by market cap descending (if available)
    #         matches.sort(key=lambda x: float(x.get("market_cap", 0)), reverse=True)

    #         return matches[0]["address"] if matches else None

    #     except Exception as error:
    #         logger.error(f"Error fetching token address: {str(error)}")
    #         return None

    def register_actions(self) -> None:
        self.actions = {
            "get-token-by-ticker": Action(
                name="get-token-by-ticker",
                parameters=[
                    ActionParameter("ticker", True, str, "Token ticker symbol to look up")
                ],
                description="Get token address by ticker symbol"
            ),
            "get-balance": Action(
                name="get-balance",
                parameters=[
                    ActionParameter("address", False, str, "Address to check balance for"),
                    ActionParameter("token_address", False, str, "Optional token address"),
                    ActionParameter("privy_wallet_id", False, str, "Optional Privy wallet ID")
                ],
                description="Get $S or token balance"
            ),
            "transfer": Action(
                name="transfer",
                parameters=[
                    ActionParameter("to_address", True, str, "Recipient address"),
                    ActionParameter("amount", True, float, "Amount to transfer"),
                    ActionParameter("token_address", False, str, "Optional token address"),
                    ActionParameter("privy_wallet_id", True, str, "Privy wallet ID")
                ],
                description="Send $S or tokens"
            ),
            "swap": Action(
                name="swap",
                parameters=[
                    ActionParameter("token_in", True, str, "Input token address"),
                    ActionParameter("token_out", True, str, "Output token address"),
                    ActionParameter("amount", True, float, "Amount to swap"),
                    ActionParameter("slippage", False, float, "Max slippage percentage"),
                    ActionParameter("privy_wallet_id", True, str, "Privy wallet ID")
                ],
                description="Swap tokens"
            ),
            "create-token": Action(
                name="create-token",
                parameters=[
                    ActionParameter("name", True, str, "Token name"),
                    ActionParameter("symbol", True, str, "Token symbol"),
                    ActionParameter("initial_value", True, str, "Amount of S to invest (as a string)"),
                    ActionParameter("privy_wallet_id", True, str, "Privy wallet ID")
                ],
                description="Create a new token using the s.fun launchpad contract"
            ),
            "sell-token": Action(
                name="sell-token",
                parameters=[
                    ActionParameter("token_address", True, str, "Token address to sell"),
                    ActionParameter("token_amount", True, str, "Token amount to sell (as a string)"),
                    ActionParameter("min_eth_out", True, str, "Minimum S to receive (as a string)"),
                    ActionParameter("privy_wallet_id", True, str, "Privy wallet ID")
                ],
                description="Sell a token using the s.fun contract's sell function"
            ),
            "get-sell-quote": Action(
                name="get-sell-quote",
                parameters=[
                    ActionParameter("token_address", True, str, "Token address to sell"),
                    ActionParameter("token_amount", True, str, "Token amount to sell (as a string)")
                ],
                description="Get the expected S (native token) amount for selling the given token amount"
            )
        }

    def configure(self) -> bool:
        logger.info("n🔷 SONIC CHAIN SETUP")
        if self.is_configured(verbose=False, require_private_key=True):
            logger.info("Sonic connection is already configured")
            response = input("Do you want to reconfigure? (y/n): ")
            if response.lower() != 'y':
                return True

        try:
            if not os.path.exists('.env'):
                with open('.env', 'w') as f:
                    f.write('')

            private_key = input("nEnter your wallet private key: ")
            if not private_key.startswith('0x'):
                private_key = '0x' + private_key
            set_key('.env', 'SONIC_PRIVATE_KEY', private_key)

            if not self._web3.is_connected():
                raise SonicConnectionError("Failed to connect to Sonic network")

            account = self._web3.eth.account.from_key(private_key)
            logger.info(f"n✅ Successfully connected with address: {account.address}")
            return True

        except Exception as e:
            logger.error(f"Configuration failed: {e}")
            return False

    def is_configured(self, verbose: bool = False, require_private_key: bool = True) -> bool:
        try:
            # For read-only operations or Privy-signed operations, we only need web3 connection
            if not require_private_key:
                return self._web3.is_connected()

            # Check for Privy configuration
            load_dotenv()
            privy_configs = ['PRIVY_APP_ID', 'PRIVY_APP_SECRET', 'PRIVY_WALLET_ID']
            if all(os.getenv(config) for config in privy_configs):
                return self._web3.is_connected()

            # Legacy private key check
            if not os.getenv('SONIC_PRIVATE_KEY'):
                if verbose:
                    logger.error("Missing SONIC_PRIVATE_KEY in .env")
                return False

            if not self._web3.is_connected():
                if verbose:
                    logger.error("Not connected to Sonic network")
                return False
            return True

        except Exception as e:
            if verbose:
                logger.error(f"Configuration check failed: {e}")
            return False

    def _get_privy_wallet_address(self, privy_wallet_id: str = None) -> str:
        """Get the actual Ethereum address for the Privy wallet"""
        try:
            load_dotenv()
            privy_app_id = os.getenv('PRIVY_APP_ID')
            privy_app_secret = os.getenv('PRIVY_APP_SECRET')
            
            # Use provided wallet ID or get from env as fallback
            if not privy_wallet_id:
                privy_wallet_id = os.getenv('PRIVY_WALLET_ID')
            
            if not all([privy_app_id, privy_app_secret, privy_wallet_id]):
                raise SonicConnectionError('Missing Privy configuration')

            url = f'https://api.privy.io/v1/wallets/{privy_wallet_id}'
            
            logger.debug(f"Fetching wallet address from Privy API: {url}")
            
            response = requests.get(
                url,
                headers={'privy-app-id': privy_app_id},
                auth=(privy_app_id, privy_app_secret)
            )
            
            if not response.ok:
                logger.error(f"Privy API error response: {response.status_code}")
                logger.error(f"Response body: {response.text}")
                raise SonicConnectionError(f'Privy API error: {response.status_code}, {response.text}')
            
            data = response.json()
            logger.debug(f"Privy API response: {json.dumps(data, indent=2)}")
            
            wallet_address = data.get('address')
            
            if not wallet_address:
                logger.error(f"Could not find wallet address in response: {json.dumps(data, indent=2)}")
                raise SonicConnectionError('Could not find wallet address in Privy response')
            
            logger.info(f"Retrieved wallet address from Privy: {wallet_address}")
            return wallet_address

        except Exception as e:
            logger.error(f"Failed to get Privy wallet address: {str(e)}")
            raise

    def get_balance(self, address: Optional[str] = None, token_address: Optional[str] = None) -> float:
        """Get balance for an address or the configured wallet"""
        try:
            if address:
                target_address = address
            else:
                # Get the actual Ethereum address instead of using Wallet ID
                target_address = self._get_privy_wallet_address()
                if not target_address:
                    raise SonicConnectionError("No wallet configured and no address provided")

            if token_address:
                contract = self._web3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=self.ERC20_ABI
                )
                balance = contract.functions.balanceOf(target_address).call()
                decimals = contract.functions.decimals().call()
                return balance / (10 ** decimals)
            else:
                balance = self._web3.eth.get_balance(target_address)
                return self._web3.from_wei(balance, 'ether')

        except Exception as e:
            logger.error(f"Failed to get balance: {e}")
            raise

    def transfer(self, to_address: str, amount: float, token_address: Optional[str] = None, privy_wallet_id: Optional[str] = None) -> str:
        try:
            # Get actual Ethereum address using provided wallet ID
            wallet_address = self._get_privy_wallet_address(privy_wallet_id)
            if not wallet_address:
                raise SonicConnectionError("No wallet configured")

            # Get latest block for fee calculation
            latest_block = self._web3.eth.get_block('latest')
            base_fee = latest_block.get('baseFeePerGas', self._web3.eth.gas_price)
            
            # Calculate fees (using wei values)
            max_priority_fee = self._web3.to_wei(1, 'gwei')  # 1 gwei priority fee
            max_fee = base_fee * 2 + max_priority_fee  # Double the base fee plus priority fee

            logger.info("Fee calculation:")
            logger.info(f"  Base Fee: {self._web3.from_wei(base_fee, 'gwei')} gwei")
            logger.info(f"  Max Priority Fee: {self._web3.from_wei(max_priority_fee, 'gwei')} gwei")
            logger.info(f"  Max Fee: {self._web3.from_wei(max_fee, 'gwei')} gwei")
            
            if token_address:
                contract = self._web3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=self.ERC20_ABI
                )
                decimals = contract.functions.decimals().call()
                amount_raw = int(amount * (10 ** decimals))
                
                tx = contract.functions.transfer(
                    Web3.to_checksum_address(to_address),
                    amount_raw
                ).build_transaction({
                    'from': wallet_address,
                    'nonce': self._web3.eth.get_transaction_count(wallet_address),
                    'chainId': self._web3.eth.chain_id,
                    'type': 2,  # EIP-1559
                    'maxFeePerGas': max_fee,
                    'maxPriorityFeePerGas': max_priority_fee
                })
            else:
                tx = {
                    'from': wallet_address,
                    'to': Web3.to_checksum_address(to_address),
                    'value': self._web3.to_wei(amount, 'ether'),
                    'nonce': self._web3.eth.get_transaction_count(wallet_address),
                    'chainId': self._web3.eth.chain_id,
                    'type': 2,  # EIP-1559
                    'maxFeePerGas': max_fee,
                    'maxPriorityFeePerGas': max_priority_fee
                }

            # Add gas estimation with detailed logging
            try:
                logger.info("Attempting gas estimation...")
                estimated_gas = self._web3.eth.estimate_gas(tx)
                tx['gas'] = int(estimated_gas * 1.2)  # Add 20% buffer
                logger.info(f"Estimated gas: {estimated_gas}")
                logger.info(f"Final gas limit with buffer: {tx['gas']}")
            except Exception as e:
                logger.error(f"Gas estimation failed: {str(e)}")
                raise

            # Log pre-signing transaction details
            logger.info("Pre-signing transaction details:")
            for key, value in tx.items():
                if key == 'data':
                    logger.info(f"  {key}: <truncated>")
                else:
                    logger.info(f"  {key}: {value}")

            # Sign and send with detailed logging
            logger.info("Starting Privy signing process...")
            try:
                signed_tx = self.sign_transaction_via_privy(tx, privy_wallet_id)
                logger.info(f"Signed transaction length: {len(signed_tx)}")
                logger.info(f"Signed transaction hex prefix: {signed_tx.hex()[:100]}...")
                
                logger.info("Sending signed transaction...")
                tx_hash = self._web3.eth.send_raw_transaction(signed_tx)
                logger.info(f"Transaction hash: {tx_hash.hex()}")
                
                tx_link = self._get_explorer_link(tx_hash.hex())
                return f"n⛓️ Transfer transaction sent: {tx_link}"
            except Exception as e:
                logger.error(f"Transaction failed: {str(e)}")
                if hasattr(e, 'response'):
                    logger.error(f"Response: {e.response.text if hasattr(e, 'response') else 'No response'}")
                raise

        except Exception as e:
            logger.error(f"Transfer failed with detailed error: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'args'):
                logger.error(f"Error args: {e.args}")
            raise

    def _get_swap_route(self, token_in: str, token_out: str, amount_in: float) -> Dict:
        """Get the best swap route from Kyberswap API"""
        try:
            # Handle native token address
            
            # Convert amount to raw value
            if token_in.lower() == self.NATIVE_TOKEN.lower():
                amount_raw = self._web3.to_wei(amount_in, 'ether')
            else:
                token_contract = self._web3.eth.contract(
                    address=Web3.to_checksum_address(token_in),
                    abi=self.ERC20_ABI
                )
                decimals = token_contract.functions.decimals().call()
                amount_raw = int(amount_in * (10 ** decimals))
            
            # Set up API request
            url = f"{self.aggregator_api}/routes"
            headers = {"x-client-id": "ZerePyBot"}
            params = {
                "tokenIn": token_in,
                "tokenOut": token_out,
                "amountIn": str(amount_raw),
                "gasInclude": "true"
            }
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get("code") != 0:
                raise SonicConnectionError(f"API error: {data.get('message')}")
                
            return data["data"]
                
        except Exception as e:
            logger.error(f"Failed to get swap route: {e}")
            raise

    def _get_encoded_swap_data(self, route_summary: Dict, slippage: float = 0.5, privy_wallet_id: Optional[str] = None) -> str:
        """Get encoded swap data from Kyberswap API"""
        try:
            # Get the actual wallet address using provided wallet ID
            wallet_address = self._get_privy_wallet_address(privy_wallet_id)
            logger.debug(f"Using wallet address for swap encoding: {wallet_address}")
            
            url = f"{self.aggregator_api}/route/build"
            
            # Add authorization headers
            auth_key = os.getenv('PRIVY_AUTHORIZATION_KEY')
            timestamp = str(int(time.time()))
            
            payload = {
                "routeSummary": route_summary,
                "sender": wallet_address,
                "recipient": wallet_address,
                "slippageTolerance": int(slippage * 100),
                "deadline": int(time.time() + 1200),
                "source": "ZerePyBot"
            }
            
            # Generate signature
            message = f"{timestamp}|{json.dumps(payload, sort_keys=True)}"
            signature = hmac.new(
                auth_key.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            headers = {
                "x-client-id": "zerepy",
                "Content-Type": "application/json",
                "privy-authorization-signature": signature,
                "privy-timestamp": timestamp
            }
            
            logger.debug(f"Sending route/build request with payload: {json.dumps(payload, indent=2)}")
            response = requests.post(url, headers=headers, json=payload)
            
            if not response.ok:
                logger.error(f"Route build failed with status {response.status_code}")
                logger.error(f"Response body: {response.text}")
                response.raise_for_status()
            
            data = response.json()
            if data.get("code") != 0:
                error_msg = data.get("message", "Unknown API error")
                logger.error(f"API returned error code: {error_msg}")
                raise SonicConnectionError(f"API error: {error_msg}")
            
            encoded_data = data["data"]["data"]
            logger.debug(f"Successfully encoded swap data")
            return encoded_data
            
        except Exception as e:
            logger.error(f"Failed to encode swap data: {str(e)}")
            if isinstance(e, requests.exceptions.RequestException):
                logger.error(f"Request failed with response: {e.response.text if hasattr(e, 'response') else 'No response'}")
            raise
    
    def _handle_token_approval(self, token_address: str, spender_address: str, amount: int, privy_wallet_id: Optional[str] = None) -> None:
        """Handle token approval for spender"""
        try:
            wallet_address = self._get_privy_wallet_address(privy_wallet_id)
            
            token_contract = self._web3.eth.contract(
                address=Web3.to_checksum_address(token_address),
                abi=self.ERC20_ABI
            )
            
            # Check current allowance
            current_allowance = token_contract.functions.allowance(
                wallet_address,
                spender_address
            ).call()
            
            if current_allowance < amount:
                # Get latest block for fee calculation
                latest_block = self._web3.eth.get_block('latest')
                base_fee = latest_block.get('baseFeePerGas', self._web3.eth.gas_price)
                max_priority_fee = self._web3.to_wei(1, 'gwei')
                max_fee = base_fee * 2 + max_priority_fee
                
                approve_tx = token_contract.functions.approve(
                    spender_address,
                    amount
                ).build_transaction({
                    'from': wallet_address,
                    'nonce': self._web3.eth.get_transaction_count(wallet_address),
                    'chainId': self._web3.eth.chain_id,
                    'type': 2,  # EIP-1559
                    'maxFeePerGas': max_fee,
                    'maxPriorityFeePerGas': max_priority_fee,
                    'gas': self._web3.eth.estimate_gas({
                        'from': wallet_address,
                        'to': token_address,
                        'data': token_contract.encodeABI('approve', [spender_address, amount])
                    })
                })
                
                signed_approve = self.sign_transaction_via_privy(approve_tx, privy_wallet_id)
                tx_hash = self._web3.eth.send_raw_transaction(signed_approve)

                logger.info(f"Approval transaction sent: {self._get_explorer_link(tx_hash.hex())}")
                
                # Wait for approval to be mined
                self._web3.eth.wait_for_transaction_receipt(tx_hash)
                
        except Exception as e:
            logger.error(f"Approval failed: {e}")
            raise

    def _get_swap_quote(self, token_in: str, token_out: str, amount: float) -> Dict:
        """Get swap quote to show expected output amount"""
        try:
            route_data = self._get_swap_route(token_in, token_out, amount)
            summary = route_data.get("routeSummary", {})
            
            # Get token details for better formatting
            token_in_decimals = 18  # Default for native token
            token_out_decimals = 18  # Default
            
            if token_in.lower() != self.NATIVE_TOKEN.lower():
                token_in_contract = self._web3.eth.contract(
                    address=Web3.to_checksum_address(token_in),
                    abi=self.ERC20_ABI
                )
                token_in_decimals = token_in_contract.functions.decimals().call()
                
            if token_out.lower() != self.NATIVE_TOKEN.lower():
                token_out_contract = self._web3.eth.contract(
                    address=Web3.to_checksum_address(token_out),
                    abi=self.ERC20_ABI
                )
                token_out_decimals = token_out_contract.functions.decimals().call()
                
            amount_out = float(summary.get("amountOut", 0)) / (10 ** token_out_decimals)
            
            return {
                "amountIn": amount,
                "amountOut": amount_out,
                "priceImpact": summary.get("priceImpact", 0)
            }
                
        except Exception as e:
            logger.error(f"Failed to get swap quote: {e}")
            raise

    def swap(self, token_in: str, token_out: str, amount: float, slippage: float = 0.5, privy_wallet_id: Optional[str] = None) -> str:
        try:
            # Get actual Ethereum address using provided wallet ID
            wallet_address = self._get_privy_wallet_address(privy_wallet_id)
            logger.error(f"DEBUG: Starting swap with wallet: {wallet_address}")  # Changed to error for visibility

            # Check token balance before proceeding
            try:
                current_balance = self.get_balance(
                    address=wallet_address,
                    token_address=None if token_in.lower() == self.NATIVE_TOKEN.lower() else token_in
                )
                logger.error(f"DEBUG: Balance check - Required: {amount}, Available: {current_balance}")
            except Exception as e:
                logger.error(f"DEBUG: Balance check failed with error: {str(e)}")
                logger.error(f"DEBUG: Error type: {type(e).__name__}")
                raise
                
            if current_balance < amount:
                logger.error(f"DEBUG: Insufficient balance. Required: {amount}, Available: {current_balance}")
                raise ValueError(f"Insufficient balance. Required: {amount}, Available: {current_balance}")
                
            # Get optimal swap route
            try:
                logger.error("DEBUG: Fetching optimal swap route from KyberSwap...")
                route_data = self._get_swap_route(token_in, token_out, amount)
                logger.error(f"DEBUG: Route data received: {json.dumps(route_data, indent=2)}")
            except Exception as e:
                logger.error(f"DEBUG: Failed to get swap route: {str(e)}")
                logger.error(f"DEBUG: Error type: {type(e).__name__}")
                raise
            
            # Get encoded swap data
            try:
                logger.error("DEBUG: Getting encoded swap data from KyberSwap...")
                encoded_data = self._get_encoded_swap_data(route_data["routeSummary"], slippage, privy_wallet_id)
                router_address = route_data["routerAddress"]
                logger.error(f"DEBUG: Router address: {router_address}")
                logger.error(f"DEBUG: Encoded data length: {len(encoded_data)}")
            except Exception as e:
                logger.error(f"DEBUG: Failed to get encoded swap data: {str(e)}")
                logger.error(f"DEBUG: Error type: {type(e).__name__}")
                raise
            
            # Handle token approval if not using native token
            if token_in.lower() != self.NATIVE_TOKEN.lower():
                logger.info(f"Token approval check needed for {token_in}")
                if token_in.lower() == "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38".lower():  # $S token
                    amount_raw = self._web3.to_wei(amount, 'ether')
                else:
                    token_contract = self._web3.eth.contract(
                        address=Web3.to_checksum_address(token_in),
                        abi=self.ERC20_ABI
                    )
                    decimals = token_contract.functions.decimals().call()
                    amount_raw = int(amount * (10 ** decimals))
                self._handle_token_approval(token_in, router_address, amount_raw, privy_wallet_id)
            
            # Get latest block for fee calculation
            latest_block = self._web3.eth.get_block('latest')
            base_fee = latest_block.get('baseFeePerGas', self._web3.eth.gas_price)
            
            # Calculate fees (using wei values)
            max_priority_fee = self._web3.to_wei(1, 'gwei')  # 1 gwei priority fee
            max_fee = base_fee * 2 + max_priority_fee  # Double the base fee plus priority fee

            logger.info("Fee calculation:")
            logger.info(f"  Base Fee: {self._web3.from_wei(base_fee, 'gwei')} gwei")
            logger.info(f"  Max Priority Fee: {self._web3.from_wei(max_priority_fee, 'gwei')} gwei")
            logger.info(f"  Max Fee: {self._web3.from_wei(max_fee, 'gwei')} gwei")

            # Prepare transaction with EIP-1559 format
            tx = {
                'from': wallet_address,
                'to': Web3.to_checksum_address(router_address),
                'data': encoded_data,
                'nonce': self._web3.eth.get_transaction_count(wallet_address),
                'chainId': self._web3.eth.chain_id,
                'value': self._web3.to_wei(amount, 'ether') if token_in.lower() == self.NATIVE_TOKEN.lower() else 0,
                'type': 2,  # EIP-1559
                'maxFeePerGas': max_fee,
                'maxPriorityFeePerGas': max_priority_fee
            }

            # Add gas estimation with detailed logging
            try:
                logger.info("Attempting gas estimation...")
                estimated_gas = self._web3.eth.estimate_gas(tx)
                tx['gas'] = int(estimated_gas * 1.2)
                logger.info(f"Estimated gas: {estimated_gas}")
                logger.info(f"Final gas limit with buffer: {tx['gas']}")
            except Exception as e:
                logger.error(f"Gas estimation failed: {str(e)}")
                raise

            # Log pre-signing transaction details
            logger.info("Pre-signing transaction details:")
            for key, value in tx.items():
                if key == 'data':
                    logger.info(f"  {key}: <truncated>")
                else:
                    logger.info(f"  {key}: {value}")

            # Sign and send with detailed logging
            logger.error("DEBUG: Starting Privy signing process...")
            try:
                signed_tx = self.sign_transaction_via_privy(tx, privy_wallet_id)
                logger.error(f"DEBUG: Signed transaction length: {len(signed_tx)}")
                logger.error(f"DEBUG: Signed transaction hex prefix: {signed_tx.hex()[:100]}...")
                
                logger.info("Sending signed transaction...")
                tx_hash = self._web3.eth.send_raw_transaction(signed_tx)
                logger.info(f"Transaction hash: {tx_hash.hex()}")
                
                tx_link = self._get_explorer_link(tx_hash.hex())
                return f"n🔄 Swap transaction sent: {tx_link}"
            except Exception as e:
                logger.error(f"Transaction failed: {str(e)}")
                if hasattr(e, 'response'):
                    logger.error(f"Response: {e.response.text if hasattr(e, 'response') else 'No response'}")
                raise

        except Exception as e:
            logger.error(f"Swap failed with detailed error: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'args'):
                logger.error(f"Error args: {e.args}")
            raise

    def perform_action(self, action_name: str, kwargs) -> Any:
        """Execute a Sonic action with validation"""
        if action_name not in self.actions:
            raise KeyError(f"Unknown action: {action_name}")

        load_dotenv()
        
        action = self.actions[action_name]
        errors = action.validate_params(kwargs)
        if errors:
            raise ValueError(f"Invalid parameters: {', '.join(errors)}")

        method_name = action_name.replace('-', '_')
        method = getattr(self, method_name)
        return method(**kwargs)

    def sign_transaction_via_privy(self, tx: Dict, privy_wallet_id: Optional[str] = None) -> bytes:
        """
        Sign transaction using Privy's EVM RPC endpoint.
        The payload is constructed with transaction fields in snake_case as required by Privy.
        
        This implementation uses the "eth_signTransaction" method. Privy will return
        a response that includes "signed_transaction" (RLP‑encoded) which we convert into bytes.
        """
        try:
            load_dotenv()
            privy_app_id = os.getenv("PRIVY_APP_ID")
            privy_app_secret = os.getenv("PRIVY_APP_SECRET")
        
            if not all([privy_app_id, privy_app_secret, privy_wallet_id]):
                raise SonicConnectionError("Missing Privy configuration - need APP_ID and APP_SECRET")
        
            # Construct URL for Privy's RPC signing endpoint.
            url = f"https://api.privy.io/v1/wallets/{privy_wallet_id}/rpc"
        
            # Helper: convert web3 transaction dict (with camelCase keys) to Privy's expected snake_case format.
            def _convert_to_privy_format(tx: Dict) -> Dict:
                privy_tx = {}
                if "nonce" in tx:
                    privy_tx["nonce"] = tx["nonce"]  # as a number per sample
                if "chainId" in tx:
                    privy_tx["chain_id"] = tx["chainId"]
                if "gasPrice" in tx:
                    privy_tx["gas_price"] = hex(tx["gasPrice"]) if isinstance(tx["gasPrice"], int) else tx["gasPrice"]
                if "gas" in tx:
                    privy_tx["gas_limit"] = hex(tx["gas"]) if isinstance(tx["gas"], int) else tx["gas"]
                if "to" in tx:
                    privy_tx["to"] = tx["to"]
                if "value" in tx:
                    # Leaving value as is (decimal) per the sample; convert if needed.
                    privy_tx["value"] = tx["value"]
                # Use provided data or default to "0x"
                privy_tx["data"] = tx.get("data", "0x")
                if "type" in tx:
                    privy_tx["type"] = tx["type"]
                if "maxFeePerGas" in tx:
                    privy_tx["max_fee_per_gas"] = hex(tx["maxFeePerGas"]) if isinstance(tx["maxFeePerGas"], int) else tx["maxFeePerGas"]
                if "maxPriorityFeePerGas" in tx:
                    privy_tx["max_priority_fee_per_gas"] = (
                        hex(tx["maxPriorityFeePerGas"]) if isinstance(tx["maxPriorityFeePerGas"], int) else tx["maxPriorityFeePerGas"]
                    )
                return privy_tx
        
            privy_tx = _convert_to_privy_format(tx)
        
            payload = {
                "method": "eth_signTransaction",
                "params": {
                    "transaction": privy_tx
                }
            }
        
            headers = {
                "privy-app-id": privy_app_id,
                "Content-Type": "application/json"
            }
        
            # Generate the required authorization signature.
            signature = self.generate_authorization_signature(method="POST", url=url, body=payload, headers=headers)
            headers["privy-authorization-signature"] = signature
        
            logger.debug(f"Sending request to Privy for signing transaction with payload: {json.dumps(payload, indent=2)}")
            response = requests.post(url, json=payload, headers=headers, auth=(privy_app_id, privy_app_secret))
        
            if not response.ok:
                logger.error(f"Privy API error: {response.status_code}")
                logger.error(f"Response body: {response.text}")
                raise SonicConnectionError(f"Privy API error: {response.status_code}, {response.text}")
        
            data = response.json()
            signed_tx = data.get("data", {}).get("signed_transaction")
            if not signed_tx:
                raise SonicConnectionError("No signed_transaction in Privy response")
        
            logger.debug(f"Received signed transaction: {signed_tx}")
            return bytes.fromhex(signed_tx[2:] if signed_tx.startswith("0x") else signed_tx)
        
        except Exception as e:
            logger.error(f"Privy signing error: {str(e)}")
            raise

    def generate_authorization_signature(self, method: str, url: str, body: Dict, headers: Dict) -> str:
        """Generate authorization signature using ECDSA P-256 per Privy's specification.
        
        The JSON payload for signing includes:
          {
            "version": 1,
            "method": <HTTP method, e.g. "POST">,
            "url": <URL without trailing slash>,
            "body": <Payload JSON>,
            "headers": {"privy-app-id": <your-app-id>}
          }
        The payload is serialized with sorted keys and compact separators.
        """
        try:
            # Build payload to be signed.
            signature_payload = {
                "version": 1,
                "method": method,
                "url": url.rstrip('/'),
                "body": body,
                "headers": {"privy-app-id": headers.get("privy-app-id")}
            }
            
            # Serialize payload in a canonical form.
            serialized_payload = json.dumps(signature_payload, sort_keys=True, separators=(',', ':'))
            
            # Load the authorization key from environment.
            load_dotenv()
            auth_key = os.getenv('PRIVY_AUTHORIZATION_KEY')
            if not auth_key:
                raise SonicConnectionError("Missing PRIVY_AUTHORIZATION_KEY in .env")
            
            # Remove the "wallet-auth:" prefix if present and convert to PEM format.
            private_key_string = auth_key.replace("wallet-auth:", "")
            private_key_pem = (
                f"-----BEGIN PRIVATE KEY-----\n"
                f"{private_key_string}\n"
                f"-----END PRIVATE KEY-----"
            )
            
            # Load the private key.
            private_key = serialization.load_pem_private_key(
                private_key_pem.encode('utf-8'),
                password=None
            )
            
            # Sign the canonicalized payload.
            signature = private_key.sign(
                serialized_payload.encode('utf-8'),
                ec.ECDSA(hashes.SHA256())
            )
            
            # Return the signature as a base64-encoded string.
            return base64.b64encode(signature).decode('utf-8')
        
        except Exception as e:
            logger.error(f"Failed to generate authorization signature: {str(e)}")
            logger.error(f"Payload being signed: {json.dumps(signature_payload, indent=2)}")
            raise

    def create_token(self, name: str, symbol: str, initial_value: str, privy_wallet_id: Optional[str] = None) -> str:
        try:
            # Convert initial_value to float
            initial_value_float = float(initial_value)
            
            # Get wallet address from Privy
            wallet_address = self._get_privy_wallet_address(privy_wallet_id)
            
            # Check balance first
            current_balance = self.get_balance(address=wallet_address)
            logger.info(f"Current balance: {current_balance} S, Required: {initial_value_float} S")
            
            if current_balance < initial_value_float:
                raise ValueError(f"Insufficient balance. You have {current_balance} S but need at least {initial_value_float} S plus gas fees.")
            
            # s.fun launchpad contract address
            contract_address = "0x1c55b1C160e8D398E7535C9Ec556914aeFb51ee7"
            
            # Minimal ABI with the create function and TokenCreated event
            sfun_abi = [
                {
                    "inputs": [
                        {"internalType": "string", "name": "name", "type": "string"},
                        {"internalType": "string", "name": "symbol", "type": "string"}
                    ],
                    "name": "create",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "internalType": "address", "name": "tokenAddress", "type": "address"},
                        {"indexed": True, "internalType": "address", "name": "creator", "type": "address"},
                        {"indexed": False, "internalType": "string", "name": "name", "type": "string"},
                        {"indexed": False, "internalType": "string", "name": "symbol", "type": "string"}
                    ],
                    "name": "TokenCreated",
                    "type": "event"
                }
            ]
            
            # Create a contract instance
            contract = self._web3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=sfun_abi
            )
            
            # Set fee parameters (EIP-1559)
            latest_block = self._web3.eth.get_block("latest")
            base_fee = latest_block.get("baseFeePerGas", self._web3.eth.gas_price)
            max_priority_fee = self._web3.to_wei(1, "gwei")
            max_fee = base_fee * 2 + max_priority_fee
            
            # Build transaction to call create(name, symbol) with the initial S amount
            tx = contract.functions.create(name, symbol).build_transaction({
                "from": wallet_address,
                "nonce": self._web3.eth.get_transaction_count(wallet_address),
                "chainId": self._web3.eth.chain_id,
                "value": self._web3.to_wei(initial_value_float, "ether"),
                "type": 2,
                "maxFeePerGas": max_fee,
                "maxPriorityFeePerGas": max_priority_fee
            })
            
            # Estimate gas with a 20% buffer
            try:
                logger.info("Estimating gas for token creation...")
                estimated_gas = self._web3.eth.estimate_gas(tx)
                tx["gas"] = int(estimated_gas * 1.2)
                logger.info(f"Estimated gas: {estimated_gas}, with buffer: {tx['gas']}")
            except Exception as e:
                logger.error(f"Gas estimation failed: {str(e)}")
                if "execution reverted" in str(e):
                    # Try to extract the revert reason if available
                    logger.error(f"Contract execution reverted: {str(e)}")
                raise ValueError(f"Failed to estimate gas: {str(e)}")
            
            # Sign transaction via Privy
            try:
                logger.info("Signing transaction via Privy...")
                signed_tx = self.sign_transaction_via_privy(tx, privy_wallet_id)
                logger.info(f"Transaction signed successfully, length: {len(signed_tx)}")
            except Exception as e:
                logger.error(f"Transaction signing failed: {str(e)}")
                raise ValueError(f"Failed to sign transaction: {str(e)}")
            
            # Send the signed transaction
            try:
                logger.info("Sending signed transaction...")
                tx_hash = self._web3.eth.send_raw_transaction(signed_tx)
                logger.info(f"Token creation transaction sent: {tx_hash.hex()}")
            except Exception as e:
                logger.error(f"Transaction sending failed: {str(e)}")
                raise ValueError(f"Failed to send transaction: {str(e)}")
            
            # Wait for the transaction receipt
            try:
                logger.info("Waiting for transaction receipt...")
                receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                logger.info(f"Transaction mined with status: {receipt.status}")
                
                if receipt.status != 1:
                    logger.error(f"Transaction failed with status: {receipt.status}")
                    raise ValueError("Transaction failed on-chain. Check the transaction in the block explorer.")
            except Exception as e:
                logger.error(f"Error waiting for receipt: {str(e)}")
                tx_link = self._get_explorer_link(tx_hash.hex())
                return f"⚠️ Token creation transaction sent but status unknown: {tx_link}"
            
            # Process the receipt to extract the TokenCreated event
            try:
                events = contract.events.TokenCreated().process_receipt(receipt)
                if events and len(events) > 0:
                    new_token_address = events[0]["args"]["tokenAddress"]
                    tx_link = self._get_explorer_link(tx_hash.hex())
                    token_explorer_link = f"{self.explorer}/token/{new_token_address}"
                    
                    # Get the token balance after creation
                    try:
                        # Create a contract instance for the new token
                        new_token_contract = self._web3.eth.contract(
                            address=Web3.to_checksum_address(new_token_address),
                            abi=self.ERC20_ABI
                        )
                        
                        # Get the token balance of the creator
                        token_balance = new_token_contract.functions.balanceOf(wallet_address).call()
                        token_decimals = new_token_contract.functions.decimals().call()
                        token_balance_readable = token_balance / (10 ** token_decimals)
                        
                        # Return with token balance information
                        return f"🪙 Token {symbol} created successfully!\n📝 Token Address: {new_token_address}\n💰 Initial Token Balance: {token_balance_readable:,.2f} {symbol}\n🔍 Token Explorer: {token_explorer_link}\n⛓️ Transaction: {tx_link}"
                    except Exception as e:
                        logger.error(f"Error getting token balance: {str(e)}")
                        # Fall back to original return if balance check fails
                        return f"🪙 Token {symbol} created successfully!\n📝 Token Address: {new_token_address}\n🔍 Token Explorer: {token_explorer_link}\n⛓️ Transaction: {tx_link}"
                else:
                    logger.error("TokenCreated event not found in receipt")
                    tx_link = self._get_explorer_link(tx_hash.hex())
                    return f"⚠️ Transaction completed but token creation event not found: {tx_link}"
            except Exception as e:
                logger.error(f"Error processing events: {str(e)}")
                tx_link = self._get_explorer_link(tx_hash.hex())
                return f"⚠️ Transaction completed but error processing events: {tx_link}"
            
        except Exception as e:
            logger.error(f"Token creation failed: {str(e)}")
            if "insufficient funds" in str(e).lower():
                raise ValueError("Insufficient funds for token creation. Make sure you have enough S for the initial value plus gas fees.")
            raise

    def get_sell_quote(self, token_address: str, token_amount: str) -> str:
        """
        Get the expected amount of S (native token) for selling a given token amount.
        token_amount is a human‐readable string (e.g. "39.460666").
        Returns a dictionary with quote details including estimated output, min output, 
        price impact, fee, and market cap information.
        """
        try:
            # Create an ERC20 contract instance to fetch decimals
            token_contract = self._web3.eth.contract(
                address=Web3.to_checksum_address(token_address),
                abi=self.ERC20_ABI
            )
            decimals = token_contract.functions.decimals().call()

            # Convert the human-readable token amount to the smallest unit
            token_amount_int = int(float(token_amount) * (10 ** decimals))
            
            # Check if amount is valid (greater than zero)
            if token_amount_int <= 0:
                error_response = {
                    "error": True,
                    "detail": "Invalid amount. Amount must be greater than zero."
                }
                return json.dumps(error_response)

            # Minimal ABI for the calculateCurvedSellReturn function
            sell_quote_abi = [
                {
                    "inputs": [
                        {"internalType": "address", "name": "tokenAddress", "type": "address"},
                        {"internalType": "uint256", "name": "tokenAmount", "type": "uint256"}
                    ],
                    "name": "calculateCurvedSellReturn",
                    "outputs": [
                        {"internalType": "uint256", "name": "", "type": "uint256"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]

            # Create a contract instance using the s.fun launchpad contract
            contract_address = "0x1c55b1C160e8D398E7535C9Ec556914aeFb51ee7"
            contract = self._web3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=sell_quote_abi
            )

            # Call the view function
            result = contract.functions.calculateCurvedSellReturn(
                Web3.to_checksum_address(token_address),
                token_amount_int
            ).call()

            # Assume the native token (S) has 18 decimals
            result_readable = float(result) / (10 ** 18)
            
            # If the result is zero or extremely small, it means the swap would fail
            if result_readable <= 0.000001:
                error_response = {
                    "error": True,
                    "detail": "Swap failed silently - amount too small or token has insufficient liquidity."
                }
                return json.dumps(error_response)
            
            # Calculate a fee (0.5%)
            fee = result_readable * 0.005
            estimated_output = result_readable - fee
            
            # Apply a 1% slippage tolerance for min output
            min_output = estimated_output * 0.99
            
            # Calculate simple price impact (just an estimate)
            price_impact = "0.5"  # Placeholder - this would require more complex calculation
            
            # Get market cap if possible
            market_cap = 0
            try:
                # This is a simplified approach - actual market cap calculation would be more complex
                total_supply = token_contract.functions.totalSupply().call() / (10 ** decimals)
                
                # Get token price in S - simplified using our quote
                token_price = estimated_output / float(token_amount)
                
                # Calculate market cap in S
                market_cap = total_supply * token_price
            except Exception as mc_error:
                logger.warning(f"Could not calculate market cap: {str(mc_error)}")
            
            # Prepare the response
            quote_response = {
                "result": {
                    "estimated_output": str(estimated_output),
                    "min_output": str(min_output),
                    "price_impact": price_impact,
                    "fee": str(fee),
                    "market_cap": str(market_cap),
                }
            }
            
            return json.dumps(quote_response)

        except Exception as e:
            logger.error(f"Failed to get sell quote: {str(e)}")
            error_detail = str(e)
            
            # Provide more helpful error messages
            if "execution reverted" in error_detail:
                error_detail = "Swap calculation failed - token may have trading restrictions or insufficient liquidity."
            elif "gas required exceeds allowance" in error_detail:
                error_detail = "Gas estimation failed - token may have complex transfer logic or restrictions."
            
            error_response = {
                "error": True,
                "detail": f"Failed to get sell quote: {error_detail}"
            }
            return json.dumps(error_response)

    def sell_token(self, token_address: str, token_amount: str, min_eth_out: str, privy_wallet_id: Optional[str] = None) -> str:
        """
        Sell a given token for S (native token) using the s.fun contract's sell function.
        - token_address: the token being sold
        - token_amount: the amount to sell (human-readable string; converted to smallest unit using the token's decimals)
        - min_eth_out: the minimum S (human-readable string; converted using 18 decimals) the seller will accept
        - privy_wallet_id: the identifier of the Privy wallet that signs the transaction.
        Returns a JSON string with transaction details including hash and explorer link.
        """
        try:
            # First, get the seller's wallet address
            wallet_address = self._get_privy_wallet_address(privy_wallet_id)

            # Get token decimals from its ERC20 contract
            token_contract = self._web3.eth.contract(
                address=Web3.to_checksum_address(token_address),
                abi=self.ERC20_ABI
            )
            decimals = token_contract.functions.decimals().call()

            # Convert token_amount to the smallest unit using the token's decimals
            token_amount_int = int(float(token_amount) * (10 ** decimals))

            # Convert min_eth_out to the smallest unit (18 decimals for S)
            min_eth_out_int = int(float(min_eth_out) * (10 ** 18))

            # Check if the caller has enough tokens
            token_balance = token_contract.functions.balanceOf(wallet_address).call()
            if token_balance < token_amount_int:
                error_response = {
                    "error": True,
                    "detail": f"Insufficient token balance. You have {token_balance / (10 ** decimals)} tokens but are trying to sell {token_amount}."
                }
                return json.dumps(error_response)

            # Check for token allowance
            try:
                # Create contract instance for the s.fun contract
                contract_address = "0x1c55b1C160e8D398E7535C9Ec556914aeFb51ee7"
                allowed = token_contract.functions.allowance(wallet_address, contract_address).call()
                
                if allowed < token_amount_int:
                    # Instead of returning an error, automatically handle the approval
                    try:
                        logger.info(f"Token allowance too low. Automatically approving {token_amount} tokens...")
                        
                        # Call the approval handler
                        self._handle_token_approval(
                            token_address=token_address,
                            spender_address=contract_address,
                            amount=token_amount_int,
                            privy_wallet_id=privy_wallet_id
                        )
                        
                        # Verify the approval was successful
                        new_allowance = token_contract.functions.allowance(wallet_address, contract_address).call()
                        if new_allowance < token_amount_int:
                            error_response = {
                                "error": True,
                                "detail": "Failed to approve token. Please try again or approve manually."
                            }
                            return json.dumps(error_response)
                        
                        logger.info(f"Token approval successful. Proceeding with sale...")
                    except Exception as approval_error:
                        logger.error(f"Automatic approval failed: {str(approval_error)}")
                        error_response = {
                            "error": True,
                            "detail": f"Failed to automatically approve token: {str(approval_error)}"
                        }
                        return json.dumps(error_response)
            except Exception as allowance_error:
                logger.warning(f"Could not check allowance: {str(allowance_error)}")

            # ABI for selling tokens
            sell_abi = [
                {
                    "inputs": [
                        {"internalType": "address", "name": "tokenAddress", "type": "address"},
                        {"internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
                        {"internalType": "uint256", "name": "minS", "type": "uint256"}
                    ],
                    "name": "sell",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]

            # Create contract instance
            contract = self._web3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=sell_abi
            )

            # Build the transaction
            nonce = self._web3.eth.get_transaction_count(wallet_address)
            
            # Get latest block for fee calculation - using the same approach as transfer and swap methods
            latest_block = self._web3.eth.get_block('latest')
            base_fee = latest_block.get('baseFeePerGas', self._web3.eth.gas_price)
            
            # Calculate fees (using wei values)
            max_priority_fee = self._web3.to_wei(1, 'gwei')  # 1 gwei priority fee
            max_fee = base_fee * 2 + max_priority_fee  # Double the base fee plus priority fee

            logger.info("Fee calculation for sell transaction:")
            logger.info(f"  Base Fee: {self._web3.from_wei(base_fee, 'gwei')} gwei")
            logger.info(f"  Max Priority Fee: {self._web3.from_wei(max_priority_fee, 'gwei')} gwei")
            logger.info(f"  Max Fee: {self._web3.from_wei(max_fee, 'gwei')} gwei")
            
            tx = contract.functions.sell(
                Web3.to_checksum_address(token_address),
                token_amount_int,
                min_eth_out_int
            ).build_transaction({
                'from': wallet_address,
                'nonce': nonce,
                'chainId': self._web3.eth.chain_id,
                'type': 2,  # EIP-1559
                'maxFeePerGas': max_fee,
                'maxPriorityFeePerGas': max_priority_fee,
                'gas': 500000,  # Initial gas estimate
            })

            # Estimate gas with a 20% buffer
            try:
                estimated_gas = self._web3.eth.estimate_gas(tx)
                tx["gas"] = int(estimated_gas * 1.2)
                logger.info(f"Estimated gas: {estimated_gas}")
                logger.info(f"Final gas limit with buffer: {tx['gas']}")
            except Exception as gas_error:
                logger.error(f"Gas estimation failed: {str(gas_error)}")
                error_response = {
                    "error": True,
                    "detail": f"Failed to estimate gas: {str(gas_error)}"
                }
                return json.dumps(error_response)

            # Sign the transaction via Privy
            signed_tx = self.sign_transaction_via_privy(tx, privy_wallet_id)

            # Send the transaction
            tx_hash = self._web3.eth.send_raw_transaction(signed_tx)
            tx_hash_hex = tx_hash.hex()
            logger.info(f"Sell transaction sent: {tx_hash_hex}")

            # Optionally wait for receipt
            receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info("Sell transaction mined; receipt received")

            tx_link = self._get_explorer_link(tx_hash_hex)
            
            # Calculate amount received based on receipt
            amount_received = 0
            try:
                # Try to extract the amount received from the receipt
                for log in receipt.get('logs', []):
                    # This is a simplified approach - actual extraction would depend on the contract events
                    if len(log['topics']) > 0 and log['topics'][0].hex() == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef':
                        # This is a Transfer event - if to address is the user's address, it's likely the S received
                        if len(log['topics']) > 2 and log['topics'][2].hex()[-40:].lower() == wallet_address[2:].lower():
                            amount_received = int(log['data'], 16) / (10 ** 18)
                            break
            except Exception as receipt_error:
                logger.warning(f"Could not extract amount received: {str(receipt_error)}")
                # Fall back to the min output as an estimate
                amount_received = float(min_eth_out)
            
            # Prepare the successful response
            success_response = {
                "result": {
                    "transaction_hash": tx_hash_hex,
                    "explorer_url": tx_link,
                    "amount_received": str(amount_received),
                    "status": "success"
                }
            }
            
            return json.dumps(success_response)

        except Exception as e:
            logger.error(f"Sell transaction failed: {str(e)}")
            error_detail = str(e)
            
            # Provide more helpful error messages
            if "execution reverted" in error_detail:
                error_detail = "Transaction failed - token may have trading restrictions or insufficient liquidity."
            elif "gas required exceeds allowance" in error_detail:
                error_detail = "Gas estimation failed - token may have complex transfer logic or restrictions."
            elif "insufficient funds" in error_detail:
                error_detail = "Insufficient funds for gas fee. Please ensure you have enough S for the network fee."
            elif "transaction underpriced" in error_detail or "{'code': -32000" in error_detail:
                error_detail = "Transaction underpriced. Network is busy - please try again with higher gas price."
            elif "nonce too low" in error_detail:
                error_detail = "Transaction nonce issue. Please try again in a few moments."
            
            # Clean up error message if it contains a complex object
            if error_detail.startswith("{") or error_detail.startswith("'{'"):
                try:
                    # Try to extract a cleaner message from the error object
                    if "'message':" in error_detail:
                        import re
                        message_match = re.search(r"'message':\s*'([^']*)'", error_detail)
                        if message_match:
                            error_detail = message_match.group(1)
                except:
                    # If parsing fails, provide a generic message
                    error_detail = "Transaction failed. Please try again later."
            
            error_response = {
                "error": True,
                "detail": f"Sell transaction failed: {error_detail}"
            }
            return json.dumps(error_response)