DROP TABLE IF EXISTS `user`;
CREATE TABLE IF NOT EXISTS `user` (
    `us_login` varchar(16) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

UPDATE system SET sy_version = "2020-10-18" WHERE sy_version <> "2020-10-18"