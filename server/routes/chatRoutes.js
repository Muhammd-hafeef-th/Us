import express from 'express';
const router = express.Router();

/**
 * Root route - Health check
 * @route GET /
 * @returns {string} Server status message
 */
router.get('/', (req, res) => {
  res.status(200).send('Us Chat Server is running');
});

export default router;
