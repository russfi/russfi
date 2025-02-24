<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\TokenData;

class AIResearchController extends Controller
{
    // Show a simple research page
    public function show(Request $request)
    {
        $message = 'Hi, what token do you want me to research?';
        return Inertia::render('AIResearch', [
            'initialMessage' => $message
        ]);
    }

    // Handle the research action
    public function handleAction(Request $request)
    {
        $action = $request->input('action');
        if ($action === 'research') {
            return response()->json($this->getResearch());
        }
        return response()->json(['error' => 'Invalid action'], 400);
    }

    // Get tokens and call OpenAI for research analysis
    private function getResearch()
    {
        // Get tokens with a simple filter
        $tokens = TokenData::where('market_cap', '>', 1000000)
            ->limit(5)
            ->get();

        $tokenData = $tokens->map(function($token) {
            return [
                'name'       => $token->token_name,
                'symbol'     => $token->symbol,
                'market_cap' => $token->market_cap,
            ];
        })->toArray();

        // Prepare messages for OpenAI
        $messages = [
            [
                'role'    => 'system',
                'content' => 'You are a crypto advisor. Analyze these tokens and return a JSON object with analysis.'
            ],
            [
                'role'    => 'user',
                'content' => json_encode(['data' => $tokenData])
            ]
        ];

        $postData = [
            'model'           => 'ft:gpt-4o-mini-2024-07-18:audiolingo:russfi:B364JfVX',
            'messages'        => $messages,
            'temperature'     => 1,
            'max_tokens'      => 2048,
            'response_format' => ['type' => 'json_object']
        ];

        $apiKey = config('openai.api_key');
        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS     => json_encode($postData),
            CURLOPT_TIMEOUT        => 30
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        $analysis = json_decode($response, true);
        return [
            'message' => [
                'type'    => 'research_results',
                'content' => $analysis
            ]
        ];
    }
}
