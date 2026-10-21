<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Services\AuthService;
use App\Helpers\Response;
use App\Helpers\Security;
use App\Validators\Validator;
use Exception;

class AuthController extends Controller
{
    public function login(): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'username' => 'required',
            'password' => 'required'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        $rememberMe = !empty($input['remember_me']);

        try {
            $user = AuthService::login($input['username'], $input['password'], $rememberMe);
            Response::success($user, 'Login successful');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public function logout(): void
    {
        AuthService::logout();
        Response::success(null, 'Logged out successfully');
    }

    public function me(): void
    {
        $user = AuthService::getCurrentUser();
        if (!$user) {
            Response::unauthorized('Session expired or not logged in.');
            return;
        }

        $user['token'] = session_id();
        $user['csrf_token'] = Security::generateCsrfToken();
        Response::success($user);
    }

    public function csrfToken(): void
    {
        $token = Security::generateCsrfToken();
        Response::success(['csrf_token' => $token]);
    }

    public function changePassword(): void
    {
        $userId = $this->getUserId();
        if (!$userId) {
            Response::unauthorized();
            return;
        }

        $input = $this->getJsonInput();
        $validator = Validator::make($input, [
            'current_password' => 'required',
            'new_password'     => 'required|min:8'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            AuthService::changePassword($userId, $input['current_password'], $input['new_password']);
            Response::success(null, 'Password updated successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function updateProfile(): void
    {
        $userId = $this->getUserId();
        if (!$userId) {
            Response::unauthorized();
            return;
        }

        $input = $this->getJsonInput();
        $validator = Validator::make($input, [
            'full_name' => 'required|max:120'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $updated = AuthService::updateProfile($userId, $input);
            Response::success($updated, 'Profile updated successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Controlled Student Account Activation: Step 1 (Initiate via Student ID + Institutional Email)
     */
    public function initiateActivation(): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'roll_number' => 'required|min:3|max:50',
            'email'       => 'required|email|max:120'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $result = AuthService::initiateStudentActivation($input['roll_number'], $input['email']);
            Response::success($result, $result['message']);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Controlled Student Account Activation: Step 2 (Verify Time-Limited OTP)
     */
    public function verifyActivationOtp(): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'roll_number'   => 'required',
            'email'         => 'required|email',
            'otp'           => 'required|min:4|max:10',
            'session_token' => 'required'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $result = AuthService::verifyActivationOtp($input['roll_number'], $input['email'], $input['otp'], $input['session_token']);
            Response::success($result, $result['message']);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Controlled Student Account Activation: Step 3 (Set Secure Password & Complete Setup)
     */
    public function completeActivation(): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'roll_number'          => 'required',
            'email'                => 'required|email',
            'password_grant_token' => 'required',
            'password'             => 'required|min:8'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $phone = !empty($input['phone']) ? $input['phone'] : null;
            $result = AuthService::completeStudentActivation(
                $input['roll_number'],
                $input['email'],
                $input['password_grant_token'],
                $input['password'],
                $phone
            );
            Response::success($result, $result['message'], 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Forgot Password: Request OTP / Verification Token
     * Returns generic message to prevent account enumeration
     */
    public function forgotPassword(): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'identifier' => 'required'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $result = AuthService::requestPasswordReset($input['identifier']);
            Response::success($result, $result['message']);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Forgot Password: Complete Reset with OTP Code and New Password
     */
    public function resetPassword(): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'email'        => 'required|email',
            'otp'          => 'required',
            'new_password' => 'required|min:8'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $result = AuthService::resetPassword($input['email'], $input['otp'], $input['new_password']);
            Response::success($result, $result['message']);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
}
