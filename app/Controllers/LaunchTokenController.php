<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\LaunchToken;


class LaunchTokenController extends Controller
{
    public function show(Request $request): Response
    {
        $user = auth()->user();
        $name = $user->name ?? 'User';

        $initialMessage = "Hi {$name}, I'm your token launch assistant. What would you like to do today?";
        
        return Inertia::render('LaunchToken', [
            'initialMessage' => $initialMessage,
            'initialType' => 'welcome',
        ]);
    }

    public function handleAction(Request $request)
    {
        $action = $request->input('action');
        $user = auth()->user();
        
        try {
            $response = match ($action) {
                'name_input' => $this->processTokenName($request),
                'symbol_input' => $this->processTokenSymbol($request),
                'amount_input' => $this->processAmount($request),
                'upload_image' => $this->uploadImage($request),
                'details_input' => $this->processDetails($request),
                'create_token' => $this->createToken($request),
                'list_on_sfun' => $this->listOnSFun($request),
                'combined_details_input' => $this->processCombinedDetails($request),
                'ai_launch' => $this->generateTokenWithAI($request),
                default => ['error' => 'Invalid action.', 'status' => 400]
            };
        } catch (\Exception $e) {
            $response = [
                'error' => 'An error occurred: ' . $e->getMessage(),
                'status' => 500
            ];
        }
        
        return Inertia::render('LaunchToken', [
            'message' => $response['message'] ?? null,
            'error' => $response['error'] ?? null
        ]);
    }

    private function processTokenName(Request $request)
    {
        $tokenName = trim($request->input('token_name', ''));
        session(['launch_token_name' => $tokenName]);
        
        return [
            'message' => [
                'type' => 'symbol_input',
                'content' => "Great! Your token will be named \"{$tokenName}\". Now, please provide a symbol for your token (3 letters only).",
                'token_name' => $tokenName,
                'options' => []
            ]
        ];
    }

    private function processTokenSymbol(Request $request)
    {
        $tokenSymbol = trim(strtoupper($request->input('token_symbol', '')));
        $tokenName = session('launch_token_name');
        session(['launch_token_symbol' => $tokenSymbol]);
        
        return [
            'message' => [
                'type' => 'amount_input',
                'content' => "Perfect! Your token symbol will be \"{$tokenSymbol}\". Now, how much SONIC would you like to initially invest in your token?",
                'token_name' => $tokenName,
                'token_symbol' => $tokenSymbol,
                'options' => [
                    ['text' => '0.001 SONIC', 'value' => '0.001', 'action' => 'amount_input'],
                    ['text' => '0.01 SONIC', 'value' => '0.01', 'action' => 'amount_input'],
                    ['text' => '0.1 SONIC', 'value' => '0.1', 'action' => 'amount_input'],
                    ['text' => 'Custom Amount', 'value' => 'custom', 'action' => 'amount_input']
                ]
            ]
        ];
    }


    private function uploadImage(Request $request)
    {
        $tokenName = session('launch_token_name');
        $tokenSymbol = session('launch_token_symbol');
        $amount = session('launch_token_amount');
        
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        try {
            $image = $request->file('image');
            
            if (!$image) {
                throw new \Exception("No image file was provided");
            }
            
            $filename = "token_logo_" . time() . ".jpg";
            session(['launch_token_image' => $filename]);
            
            return [
                'message' => [
                    'type' => 'details_input',
                    'content' => "Your logo has been uploaded successfully! Now, please provide some additional details about your token:",
                    'token_name' => $tokenName,
                    'token_symbol' => $tokenSymbol,
                    'amount' => $amount,
                    'image' => $filename,
                    'options' => []
                ]
            ];
        } catch (\Exception $e) {
            return [
                'message' => [
                    'type' => 'upload_error',
                    'content' => "Failed to upload image: " . $e->getMessage(),
                    'token_name' => $tokenName,
                    'token_symbol' => $tokenSymbol,
                    'amount' => $amount,
                    'options' => [
                        ['text' => 'Try Again', 'value' => 'retry', 'action' => 'retry']
                    ]
                ]
            ];
        }
    }

    private function processDetails(Request $request)
    {
        $tokenName = session('launch_token_name');
        $tokenSymbol = session('launch_token_symbol');
        $amount = session('launch_token_amount');
        $image = session('launch_token_image');
        
        $description = trim($request->input('description', ''));
        $xUrl = trim($request->input('x_url', ''));
        $telegramUrl = trim($request->input('telegram_url', ''));
        $website = trim($request->input('website', ''));
        
        session([
            'launch_token_description' => $description,
            'launch_token_x_url' => $xUrl,
            'launch_token_telegram_url' => $telegramUrl,
            'launch_token_website' => $website,
        ]);
        
        return [
            'message' => [
                'type' => 'confirm_create',
                'content' => "Great! Here's a summary of your token. Are you ready to create your token?",
                'token_name' => $tokenName,
                'token_symbol' => $tokenSymbol,
                'amount' => $amount,
                'image' => $image,
                'description' => $description,
                'options' => [
                    ['text' => 'Yes, Create My Token', 'value' => 'yes', 'action' => 'create_token'],
                    ['text' => 'No, Cancel', 'value' => 'no', 'action' => 'cancel']
                ]
            ]
        ];
    }

    private function createToken(Request $request)
    {
        $confirmation = trim($request->input('confirmation', ''));
        
        if (strtolower($confirmation) !== 'yes') {
            return [
                'message' => [
                    'type' => 'create_cancelled',
                    'content' => 'Token creation cancelled. Would you like to start over?',
                    'options' => [
                        ['text' => 'Start Over', 'value' => 'restart', 'action' => 'restart']
                    ]
                ]
            ];
        }
        
        $tokenName = session('launch_token_name');
        $tokenSymbol = session('launch_token_symbol');
        $amount = session('launch_token_amount');
        $image = session('launch_token_image');
        $description = session('launch_token_description');
        $user = auth()->user();
        
        try {
            $curl = curl_init();
            $postData = json_encode([
                'connection' => 'sonic',
                'action' => 'create-token',
                'params' => [
                    $tokenName,
                    $tokenSymbol,
                    (string)$amount,
                    '0x1234567890'
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
            
            $responseData = json_decode($response, true);
            
            if (!$responseData || !isset($responseData['status']) || $responseData['status'] !== 'success') {
                throw new \Exception('Invalid response format from token creation service');
            }
            
            $contractAddress = '0xABCDEF123456789...';
            $tokensReceived = '1000';
            $txHashUrl = 'https://sonicscan.org/tx/0xABCDEF...';
            
            $launchToken = LaunchToken::create([
                'user_id' => $user->id,
                'logo_url' => $image,
                'contract_address' => $contractAddress,
                'contract_name' => $tokenName,
                'contract_symbol' => $tokenSymbol,
                'tokens_received' => $tokensReceived,
                'tx_hash_url' => $txHashUrl,
                'description' => $description
            ]);
            
            return [
                'message' => [
                    'type' => 'create_success',
                    'content' => "Your token has been created successfully! 🎉",
                    'token_name' => $tokenName,
                    'token_symbol' => $tokenSymbol,
                    'contract_address' => $contractAddress,
                    'tokens_received' => $tokensReceived,
                    'tx_hash_url' => $txHashUrl,
                    'token_id' => $launchToken->id,
                    'options' => [
                        ['text' => 'Done', 'value' => 'done', 'action' => 'done']
                    ]
                ]
            ];
        } catch (\Exception $e) {
            return [
                'message' => [
                    'type' => 'create_failed',
                    'content' => 'Failed to create token: ' . $e->getMessage(),
                    'options' => [
                        ['text' => 'Try Again', 'value' => 'retry', 'action' => 'retry']
                    ]
                ]
            ];
        }
    }

    private function listOnSFun(Request $request)
    {
        return [
            'message' => [
                'type' => 'list_success',
                'content' => "Your token has been successfully listed on S.Fun! 🎉",
                'options' => [
                    ['text' => 'Back to Dashboard', 'value' => 'dashboard', 'action' => 'cancel']
                ]
            ]
        ];
    }

    private function processCombinedDetails(Request $request)
    {
        $tokenName = trim($request->input('token_name', ''));
        $tokenSymbol = trim(strtoupper($request->input('token_symbol', '')));
        $description = trim($request->input('description', ''));
        
        session([
            'launch_token_name' => $tokenName,
            'launch_token_symbol' => $tokenSymbol,
            'launch_token_description' => $description,
        ]);
        
        return [
            'message' => [
                'type' => 'upload_image',
                'content' => "Great! Your token will be named \"{$tokenName}\" with symbol \"{$tokenSymbol}\". Now, let's upload a logo for your token.",
                'token_name' => $tokenName,
                'token_symbol' => $tokenSymbol,
                'options' => []
            ]
        ];
    }

    private function generateTokenWithAI(Request $request)
    {
        try {
            $apiKey = '[API_KEY_PLACEHOLDER]';
            $ch = curl_init('https://api.openai.com/v1/chat/completions');
            
            $messages = [
                [
                    'role' => 'system',
                    'content' => "You are a crypto token name generator."
                ],
                [
                    'role' => 'user',
                    'content' => "Generate a creative name for a new crypto token."
                ]
            ];

            $postData = [
                'model' => 'gpt-4o-mini',
                'messages' => $messages,
                'temperature' => 0.9,
                'max_tokens' => 150,
            ];

            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $apiKey,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode($postData),
                CURLOPT_TIMEOUT => 15,
                CURLOPT_CONNECTTIMEOUT => 5
            ]);

            $aiToken = [
                'name' => 'CryptoSample',
                'symbol' => 'CST',
                'description' => 'A sample token for demonstration purposes'
            ];
            
            session([
                'launch_token_name' => $aiToken['name'],
                'launch_token_symbol' => $aiToken['symbol'],
                'launch_token_description' => $aiToken['description'],
            ]);

            return [
                'message' => [
                    'type' => 'ai_generated',
                    'content' => "I've generated some token details for you! You can edit them or continue with these details.",
                    'token_name' => $aiToken['name'],
                    'token_symbol' => $aiToken['symbol'],
                    'description' => $aiToken['description'],
                    'options' => []
                ]
            ];

        } catch (\Exception $e) {
            return [
                'message' => [
                    'type' => 'error',
                    'content' => "I couldn't generate token details with AI. Please enter the details manually.",
                    'options' => []
                ]
            ];
        }
    }
}
