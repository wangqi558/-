const express = require('express');
const router = express.Router();
const ratingObjectController = require('../controllers/ratingObjectController');
const { authenticate } = require('../middleware/auth');
const { validateRatingObject } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Rating Objects
 *   description: Rating objects management
 */

/**
 * @swagger
 * /rating-objects:
 *   get:
 *     summary: Get all rating objects
 *     tags: [Rating Objects]
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, averageRating]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Rating objects retrieved successfully
 */
router.get('/', ratingObjectController.getAllRatingObjects);

/**
 * @swagger
 * /rating-objects/{id}:
 *   get:
 *     summary: Get rating object by ID
 *     tags: [Rating Objects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rating object retrieved successfully
 *       404:
 *         description: Rating object not found
 */
router.get('/:id', ratingObjectController.getRatingObjectById);

/**
 * @swagger
 * /rating-objects:
 *   post:
 *     summary: Create a new rating object
 *     tags: [Rating Objects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Rating object created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validateRatingObject, ratingObjectController.createRatingObject);

/**
 * @swagger
 * /rating-objects/{id}:
 *   put:
 *     summary: Update rating object
 *     tags: [Rating Objects]
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
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Rating object updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating object not found
 */
router.put('/:id', authenticate, validateRatingObject, ratingObjectController.updateRatingObject);

/**
 * @swagger
 * /rating-objects/{id}:
 *   delete:
 *     summary: Delete rating object
 *     tags: [Rating Objects]
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
 *         description: Rating object deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating object not found
 */
router.delete('/:id', authenticate, ratingObjectController.deleteRatingObject);

/**
 * @swagger
 * /rating-objects/{id}/ratings:
 *   get:
 *     summary: Get all ratings for a rating object
 *     tags: [Rating Objects]
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Rating object not found
 */
router.get('/:id/ratings', ratingObjectController.getRatingsForObject);

/**
 * @swagger
 * /rating-objects/{id}/average-rating:
 *   get:
 *     summary: Get average rating for a rating object
 *     tags: [Rating Objects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Average rating retrieved successfully
 *       404:
 *         description: Rating object not found
 */
router.get('/:id/average-rating', ratingObjectController.getAverageRating);

/**
 * @swagger
 * /rating-objects/categories:
 *   get:
 *     summary: Get all rating object categories
 *     tags: [Rating Objects]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', ratingObjectController.getCategories);

module.exports = router;
