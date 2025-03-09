<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\TokenData;
use Illuminate\Support\Facades\Http;

class InstantSwapController extends Controller
{
    // Show a few tokens on the swap page
    public function show(Request $request)
    {
        $tokens = TokenData::where('verified', true)
            ->take(6)
            ->get(['token_name', 'symbol', 'price_sonic'])
            ->map(fn($t) => [
                'name'   => $t->token_name,
                'symbol' => $t->symbol,
                'price'  => $t->price_sonic,
            ]);

        return Inertia::render('Swap', [
            'initialMessage' => 'Welcome to Sonic Swap',
            'topTokens'      => $tokens,
        ]);
    }

    // Call the zerePY endpoint for a swap
    public function handleSwap(Request $request)
    {
        try {
            $postData = [
                'connection' => 'sonic',
                'action'     => 'swap',
                'params'     => [
                    $request->input('tokenIn'),
                    $request->input('tokenOut'),
                    $request->input('amount'),
                    '0.5', // slippage
                    auth()->user()->wallet_id,
                ]
            ];

            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL            => 'http://localhost:8000/agent/action',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($postData),
            ]);
            $response = curl_exec($curl);
            curl_close($curl);

            return response()->json(json_decode($response, true));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Swap failed'], 500);
        }
    }

    // Get swap details from KyberSwap API
    public function processAmount(Request $request)
    {
        $amount  = $request->input('amount');
        $tokenId = $request->input('token_id');
        if (!$amount || !$tokenId || !($tokenData = TokenData::find($tokenId))) {
            return response()->json(['error' => 'Invalid input'], 400);
        }

        try {
            $amountRaw = bcmul($amount, '1000000000000000000');
            $response = Http::get('https://aggregator-api.kyberswap.com/sonic/api/v1/routes', [
                'tokenIn'    => '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                'tokenOut'   => $tokenData->contract_address,
                'amountIn'   => $amountRaw,
                'gasInclude' => 'true'
            ]);

            if (!$response->successful()) {
                throw new \Exception('KyberSwap API failed');
            }
            $data = $response->json();
            if (!isset($data['data']['routeSummary'])) {
                throw new \Exception('Invalid response');
            }
            $routeSummary      = $data['data']['routeSummary'];
            $estimatedAmountOut = bcdiv($routeSummary['amountOut'] ?? '0', '1000000000000000000', 18);
            $priceImpact       = $routeSummary['priceImpact'] ?? 0;
            $minimumReceived   = bcmul($estimatedAmountOut, '0.99', 18);

            return response()->json([
                'message' => [
                    'type'         => 'confirm_swap',
                    'token'        => $tokenData,
                    'amount'       => $amount,
                    'swap_details' => [
                        'current_price'     => $tokenData->price_sonic,
                        'estimated_received'=> $estimatedAmountOut,
                        'price_impact'      => $priceImpact,
                        'minimum_received'  => $minimumReceived,
                        'route_summary'     => $routeSummary,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Swap details fetch failed'], 500);
        }
    }

    // Execute the swap via zerePY
    public function executeSwap(Request $request)
    {
        $confirmation = trim($request->input('confirmation'));
        $amount       = $request->input('amount');
        $tokenId      = $request->input('token_id');
        if (strtolower($confirmation) !== 'yes') {
            return response()->json(['message' => 'Swap cancelled']);
        }
        if (!$amount || !$tokenId || !($tokenData = TokenData::find($tokenId))) {
            return response()->json(['error' => 'Invalid input'], 400);
        }

        $user = auth()->user();
        try {
            $postData = [
                'connection' => 'sonic',
                'action'     => 'swap',
                'params'     => [
                    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                    $tokenData->contract_address,
                    (string)$amount,
                    '0.5',
                    $user->wallet_id,
                ]
            ];

            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL            => 'http://localhost:8000/agent/action',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST  => 'POST',
                CURLOPT_POSTFIELDS     => json_encode($postData),
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            ]);
            $response  = curl_exec($curl);
            $httpCode  = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new \Exception('Invalid response code');
            }
            $responseData = json_decode($response, true);
            if (!$responseData || ($responseData['status'] ?? '') !== 'success') {
                throw new \Exception('Swap failed');
            }

            return response()->json([
                'message'     => 'Swap executed successfully',
                'transaction' => $responseData['result'] ?? ''
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Swap execution failed'], 500);
        }
    }
}
