const router = require('express').Router();
const ctrl = require('../controllers/noteController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', validateObjectId('id'), ctrl.getOne);
router.put('/:id', validateObjectId('id'), ctrl.update);
router.delete('/:id', validateObjectId('id'), ctrl.remove);

module.exports = router;
