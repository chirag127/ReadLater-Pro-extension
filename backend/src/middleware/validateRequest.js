/**
 * Request validation middleware
 * Validates request data against schemas
 */

/**
 * Validate request data against a schema
 * @param {Object} schema - The validation schema
 * @param {string} property - The request property to validate (body, params, query)
 * @returns {Function} Middleware function
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);
    
    if (!error) {
      next();
    } else {
      const { details } = error;
      const message = details.map(i => i.message).join(', ');
      
      res.status(400).json({
        error: 'Validation Error',
        message,
        details: details
      });
    }
  };
};

module.exports = validateRequest;
