<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\LaunchToken;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SellTokenController extends Controller
{
    public function show(Request $request): Response
    {
        $user = auth()->user();
        $name = $user->name ?? 'User';
        
        // Get all tokens created by the user
        $allUserTokens = $this->getUserTokens();
        
        // Prepare the initial message
        $initialMessage = null;
        
        if (empty($allUserTokens)) {
            $initialMessage = [
                'type' => 'assistant',
                'content' => [
                    'messageType' => 'no_tokens',
                    'text' => "Hi {$name}, it looks like you don't have any tokens to sell at the moment."
                ]
            ];
        } else {
            $initialMessage = [
                'type' => 'assistant',
                'content' => [
                    'messageType' => 'token_selection',
                    'text' => "Hi {$name}, here are your current token listings. Please select a token you would like to sell:"
                ]
            ];
        }

        return Inertia::render('SellToken', [
            'userTokens' => $allUserTokens,
            'initialMessage' => $initialMessage,
            'userName' => $name,
        ]);
    }


    private function selectToken(Request $request)
    {
        // Basic token selection logic
        $tokenId = $request->input('token_id');
        $token = LaunchToken::find($tokenId);
        
        if (!$token) {
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'error',
                        'text' => 'Invalid token selection.'
                    ]
                ]
            ]);
        }
        
        // Get token balance (simplified)
        $balance = 1000; // Simplified for demonstration
        
        // Prepare amount options for the frontend
        $amount_options = [
            ['text' => "250 tokens", 'value' => 250],
            ['text' => "500 tokens", 'value' => 500],
            ['text' => "1000 tokens", 'value' => 1000],
            ['text' => 'Custom Amount', 'value' => 'custom']
        ];
        
        // Return token selection response
        return Inertia::render('SellToken', [
            'userTokens' => $this->getUserTokens(),
            'selectedToken' => [
                'id' => $token->id,
                'token_name' => $token->contract_name,
                'symbol' => $token->contract_symbol,
                'balance' => $balance
            ],
            'message' => [
                'type' => 'assistant',
                'content' => [
                    'messageType' => 'amount_selection',
                    'text' => "How many {$token->contract_name} tokens would you like to sell?",
                    'balance' => $balance,
                    'options' => $amount_options
                ]
            ]
        ]);
    }

    private function processAmount(Request $request)
    {
        $amount = $request->input('amount');
        $tokenId = $request->input('token_id');
        $token = LaunchToken::find($tokenId);
        $user = auth()->user();

        if (!$amount || !$token) {
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'error',
                        'text' => 'Invalid input. Please provide a valid amount and token.'
                    ]
                ]
            ]);
        }

        try {

            $curl = curl_init();
            
            $postData = json_encode([
                'connection' => 'sonic',
                'action' => 'get-sell-quote',
                'params' => [
                    $token->contract_address,
                    (string) $amount
                ]
            ]);
            
            curl_setopt_array($curl, [
                CURLOPT_URL => 'http://localhost:8001/agent/action',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($postData)
                ],
            ]);
            
            $response = curl_exec($curl);
            $err = curl_error($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            
            curl_close($curl);
            
            if ($err) {
                throw new \Exception('cURL Error: ' . $err);
            }
            
            if ($httpCode !== 200) {
                throw new \Exception('Invalid response code: ' . $httpCode);
            }
            
            $responseData = json_decode($response, true);
            
            // Simplified response processing
            $quoteInfo = [
                'amount' => $amount,
                'token_id' => $token->id,
                'token_name' => $token->contract_name,
                'symbol' => $token->contract_symbol,
                'estimated_output' => '0.5', // Simplified value
                'min_output' => '0.495', // Simplified value
                'price_impact' => '0.5',
                'fee' => '0.005',
                'remaining_balance' => 500, // Simplified value
                'balance' => 1000 // Simplified value
            ];
            
            // Prepare confirmation options
            $confirmation_options = [
                ['text' => 'Yes, Execute', 'value' => 'yes'],
                ['text' => 'No, Cancel', 'value' => 'no']
            ];
            
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'selectedToken' => [
                    'id' => $token->id,
                    'token_name' => $token->contract_name,
                    'symbol' => $token->contract_symbol,
                    'balance' => 1000 // Simplified value
                ],
                'currentAmount' => $amount,
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'quote_confirmation',
                        'text' => "Here's your sell quote. Would you like to proceed with this transaction?",
                        'quote' => $quoteInfo,
                        'options' => $confirmation_options
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'error',
                        'text' => 'Failed to get sell quote: ' . $e->getMessage()
                    ]
                ]
            ]);
        }
    }

    private function executeSell(Request $request)
    {
        $amount = $request->input('amount');
        $tokenId = $request->input('token_id');
        $confirmation = $request->input('confirmation');
        
        // If user canceled, return to token selection
        if ($confirmation === 'no') {
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'token_selection',
                        'text' => "The transaction has been cancelled. Please select a token you would like to sell:"
                    ]
                ]
            ]);
        }
        
        $token = LaunchToken::find($tokenId);
        $user = auth()->user();

        if (!$amount || !$token) {
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'error',
                        'text' => 'Invalid input. Please provide a valid amount and token.'
                    ]
                ]
            ]);
        }

        try {
            // First get the quote to get the min_output
            $curl = curl_init();
            
            $postData = json_encode([
                'connection' => 'sonic',
                'action' => 'get-sell-quote',
                'params' => [
                    $token->contract_address,
                    (string) $amount
                ]
            ]);
            
            curl_setopt_array($curl, [
                CURLOPT_URL => 'http://localhost:8001/agent/action',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($postData)
                ],
            ]);
            
            $response = curl_exec($curl);
            curl_close($curl);
            
            // Simplified minOutput calculation
            $minOutput = 0.495; // Simplified value

            $curl = curl_init();
            
            $postData = json_encode([
                'connection' => 'sonic',
                'action' => 'sell-token',
                'params' => [
                    $token->contract_address,
                    (string) $amount,
                    (string) $minOutput,
                    $user->wallet_id // This is not real data
                ]
            ]);
            
            curl_setopt_array($curl, [
                CURLOPT_URL => 'http://localhost:8001/agent/action',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($postData)
                ],
            ]);
            
            $response = curl_exec($curl);
            $err = curl_error($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            
            curl_close($curl);
            
            if ($err) {
                throw new \Exception('cURL Error: ' . $err);
            }
            
            if ($httpCode !== 200) {
                throw new \Exception('Invalid response code: ' . $httpCode);
            }
            
            // Simplified transaction recording
            $txHash = '0xABCDEF123...'; // Example hash, not real data
            $explorerUrl = 'https://sonicscan.org/tx/' . $txHash;
            $receivedAmount = 0.5; // Simplified value
            
            // Format the transaction data for the frontend
            $transactionData = [
                'hash' => $txHash,
                'amount_sold' => $amount,
                'amount_received' => $receivedAmount,
                'token_name' => $token->contract_name,
                'symbol' => $token->contract_symbol,
                'sonic_received' => $receivedAmount,
                'tx_hash' => $txHash,
                'explorer_url' => $explorerUrl
            ];
            
            // Prepare restart option
            $restart_option = [
                ['text' => 'Sell Another Token', 'value' => 'restart']
            ];
            
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'success',
                        'text' => 'Your tokens have been sold successfully!',
                        'transaction' => $transactionData,
                        'options' => $restart_option
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            return Inertia::render('SellToken', [
                'userTokens' => $this->getUserTokens(),
                'message' => [
                    'type' => 'assistant',
                    'content' => [
                        'messageType' => 'error',
                        'text' => 'Failed to execute sell transaction: ' . $e->getMessage()
                    ]
                ]
            ]);
        }
    }

} 

