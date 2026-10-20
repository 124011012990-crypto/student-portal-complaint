<?php

namespace App\Validators;

class Validator
{
    private array $data;
    private array $rules;
    private array $errors = [];

    public function __construct(array $data, array $rules)
    {
        $this->data = $data;
        $this->rules = $rules;
    }

    public static function make(array $data, array $rules): self
    {
        $validator = new self($data, $rules);
        $validator->validate();
        return $validator;
    }

    public function validate(): void
    {
        foreach ($this->rules as $field => $fieldRules) {
            $rulesList = is_string($fieldRules) ? explode('|', $fieldRules) : $fieldRules;
            $val = $this->data[$field] ?? null;

            foreach ($rulesList as $rule) {
                $params = [];
                if (str_contains($rule, ':')) {
                    [$rule, $paramStr] = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                }

                switch ($rule) {
                    case 'required':
                        if ($val === null || $val === '' || (is_array($val) && empty($val))) {
                            $this->addError($field, "The {$field} field is required.");
                        }
                        break;

                    case 'email':
                        if (!empty($val) && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                            $this->addError($field, "The {$field} must be a valid email address.");
                        }
                        break;

                    case 'min':
                        $min = (int) $params[0];
                        if (!empty($val) && strlen((string)$val) < $min) {
                            $this->addError($field, "The {$field} must be at least {$min} characters.");
                        }
                        break;

                    case 'max':
                        $max = (int) $params[0];
                        if (!empty($val) && strlen((string)$val) > $max) {
                            $this->addError($field, "The {$field} may not exceed {$max} characters.");
                        }
                        break;

                    case 'in':
                        if (!empty($val) && !in_array($val, $params)) {
                            $this->addError($field, "The {$field} must be one of: " . implode(', ', $params));
                        }
                        break;

                    case 'integer':
                        if (!empty($val) && !filter_var($val, FILTER_VALIDATE_INT)) {
                            $this->addError($field, "The {$field} must be an integer.");
                        }
                        break;

                    case 'numeric':
                        if (!empty($val) && !is_numeric($val)) {
                            $this->addError($field, "The {$field} must be numeric.");
                        }
                        break;
                }
            }
        }
    }

    private function addError(string $field, string $message): void
    {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function firstError(): ?string
    {
        foreach ($this->errors as $fieldErrors) {
            if (!empty($fieldErrors)) {
                return $fieldErrors[0];
            }
        }
        return null;
    }
}
