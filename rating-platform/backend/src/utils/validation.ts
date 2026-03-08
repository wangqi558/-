import Joi from 'joi';

// Email validation regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Username validation: 3-20 characters, alphanumeric and underscore only
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// Password validation: At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = Joi.object({
  email: Joi.string()
    .pattern(EMAIL_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  username: Joi.string()
    .pattern(USERNAME_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
      'string.empty': 'Username is required'
    }),
  password: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'Password is required'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your password'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .pattern(EMAIL_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
  username: Joi.string()
    .pattern(USERNAME_REGEX)
    .optional()
    .messages({
      'string.pattern.base': 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
    }),
  bio: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Bio must be less than 500 characters'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Please provide a valid URL for avatar'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),
  newPassword: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'New password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'New password is required'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'string.empty': 'Please confirm your new password'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .pattern(EMAIL_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  newPassword: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'New password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'New password is required'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'string.empty': 'Please confirm your new password'
    })
});

export const suspendUserSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.positive': 'User ID must be positive',
      'number.empty': 'User ID is required'
    }),
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason must be less than 500 characters',
      'string.empty': 'Reason is required'
    }),
  duration: Joi.string()
    .valid('1d', '3d', '7d', '30d', 'permanent')
    .required()
    .messages({
      'any.only': 'Duration must be one of: 1d, 3d, 7d, 30d, permanent',
      'string.empty': 'Duration is required'
    })
});

export const reputationActionSchema = Joi.object({
  action: Joi.string()
    .valid('increase', 'decrease')
    .required()
    .messages({
      'any.only': 'Action must be either increase or decrease',
      'string.empty': 'Action is required'
    }),
  amount: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.min': 'Amount must be at least 1',
      'number.max': 'Amount cannot exceed 100',
      'number.empty': 'Amount is required'
    }),
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason must be less than 500 characters',
      'string.empty': 'Reason is required'
    })
});
