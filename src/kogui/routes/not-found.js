function notFound (req, res) {
  res.status(404).render('not-found')
}

module.exports = notFound
