const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { authenticate } = require('../middleware/auth');
const { validateRating } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Ratings management
 */

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Create a new rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ratingObjectId
 *               - rating
 *             properties:
 *               ratingObjectId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Rating created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating object not found
 */
router.post('/', authenticate, validateRating, ratingController.createRating);

/**
 * @swagger
 * /ratings/{id}:
 *   get:
 *     summary: Get rating by ID
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rating retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating not found
 */
router.get('/:id', authenticate, ratingController.getRatingById);

/**
 * @swagger
 * /ratings/{id}:
 *   put:
 *     summary: Update rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only update own ratings
 *       404:
 *         description: Rating not found
 */
router.put('/:id', authenticate, validateRating, ratingController.updateRating);

/**
 * @swagger
 * /ratings/{id}:
 *   delete:
 *     summary: Delete rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rating deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only delete own ratings
 *       404:
 *         description: Rating not found
 */
router.delete('/:id', authenticate, ratingController.deleteRating);

/**
 * @swagger
 * /ratings/user/{userId}:
 *   get:
 *     summary: Get all ratings by user
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, rating]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', ratingController.getRatingsByUser);

/**
 * @swagger
 * /ratings/my-ratings:
 *   get:
 *     summary: Get current user's ratings
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, rating]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-ratings', authenticate, ratingController.getMyRatings);

/**
 * @swagger
 * /ratings/statistics:
 *   get:
 *     summary: Get rating statistics
 *     tags: [Ratings]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: ratingObjectId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', ratingController.getRatingStatistics);

module.exports = router;
